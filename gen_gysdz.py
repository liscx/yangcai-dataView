# -*- coding: utf-8 -*-
"""
gen_gysdz.py —— 阳光优采数据大屏「供应商对账/结算/专区规模」真实数据源提取脚本

读取 D:/dataView/源数据 下三份源文件，生成 src/data/dashboard-gysdz.json，
供以下三个组件替换原先的假数据（MOCK / 硬编码常量）：
  - SettlementMetrics.vue    -> settlement（对账结算 4 指标）
  - ProfitDetailModal.vue    -> profitDetails（按供应商分组的结算期明细）
  - ZoneSupplierScale.vue    -> zoneScale（各专区本地/电商分布）

数据口径：
  - 结算表：阳光优采供应商结算.xlsx（sheet「阳光优采对账结算」）
      已结算总金额 = 结算基数 在 (用印=已用 或 开票=已开) 的行求和
      结算基数合计 = 全部行结算基数求和（供应商收款总金额 / 总额）
      供应商收款比例 = 已结算总金额 / 结算基数合计
      新点收益 = 新点分成 全部行求和
      总结账期数 = 数据行数
      收益到账率 = 已到账期数 / 总结账期数
      用印/开票期数 = (用印=已用 或 开票=已开) 的行数
  - 供应商列表：供应商列表*.xlsx（文件名带快照日期戳，按期更新；按模糊匹配取最新一份，sheet「Sheet0」）
      各专区本地供应商总数 = 按「所属专区」分组计数
  - 电商入驻表：专区电商入驻表.xlsx（sheet「Sheet1」）
      各专区电商入驻数 = 状态为「已入驻 / 需铺品（已入驻）」的单元格计数（在岗电商）
      电商在册数 = 状态含「已入驻 / 需铺品（已入驻）/ 需下架」的计数

专区名称对齐说明（重要）：
  三份文件的专区命名不完全一致（不同团队维护）。本脚本不做模糊匹配/前缀推断，
  仅通过下方 ZONE_ALIASES 显式别名表对齐。表中每一行都需人工确认是否为同一专区，
  如对齐有误，请直接修改该表；未匹配的电商专区会记入 meta.unmatchedEcomZones。

依赖：openpyxl（国内镜像安装：pip install -i https://pypi.tuna.tsinghua.edu.cn/simple openpyxl）
"""

import json
import os
import re
import glob
import calendar
import datetime
from collections import Counter, defaultdict
import openpyxl

SRC_DIR = r"D:\dataView\源数据"
OUT_PATH = r"D:\dataView\yangcai-dataView\src\data\dashboard-gysdz.json"

SETTLEMENT_FILE = "阳光优采供应商结算.xlsx"
# 供应商列表文件名带快照日期戳(形如 供应商列表20261113155613.xlsx)，按期更新；
# 不写死具体文件名，改为按模糊匹配取目录中最新一份，避免下期文件名变化导致读不到
SUPPLIER_PATTERN = "供应商列表*.xlsx"
ECOM_FILE = "专区电商入驻表.xlsx"
PAY_FILE = "专区支付率.txt"   # 各专区「采购人支付率」(百分比 0-100)；文件未列出/缺省按 100% 计

# 电商入驻表专区名 -> 供应商列表专区名（仅后缀差异，需人工确认是否为同一专区）
ZONE_ALIASES = {
    "泰安市e采通平台": "泰安市e采通",
    "湖南省招标公司阳光优采平台": "湖南省招标公司阳光优采",
    "新疆光正电子商城": "新疆光正阳光优采平台",
    "安徽省阳光采购电子商城": "安徽省阳光优采平台",
    "宣城市国有企业采购电子商城": "宣城市阳光优采商城",
    "郑州国企采购服务中心阳光优采平台": "郑州国企采购服务中心阳光优采",
}

ECOM_PRESENT = {"已入驻", "需铺品（已入驻）", "需下架"}   # 在册/在册待处理
ECOM_ORDERED = {"已入驻", "需铺品（已入驻）"}            # 在岗/有订单电商


def load(path):
    return openpyxl.load_workbook(path, read_only=True, data_only=True)


def resolve_latest(pattern):
    """在 SRC_DIR 下按 pattern 模糊匹配文件，取「文件名时间戳最新」的一份。

    供应商列表文件名带快照日期戳（如 供应商列表20261113155613.xlsx），
    每期都会变，故按模糊匹配自动挑选最新一期，而非写死文件名。
    排序优先级：文件名中的数字时间戳(6~14位)降序 > 文件修改时间降序。
    """
    matches = sorted(glob.glob(os.path.join(SRC_DIR, pattern)), key=os.path.getmtime, reverse=True)
    if not matches:
        raise FileNotFoundError(f"在 {SRC_DIR} 下未找到匹配 {pattern} 的文件")

    def stamp(p):
        m = re.search(r'(\d{6,14})', os.path.basename(p))
        return int(m.group(1)) if m else 0

    matches.sort(key=lambda p: (stamp(p), os.path.getmtime(p)), reverse=True)
    chosen = os.path.basename(matches[0])
    if len(matches) > 1:
        print(f"  [info] 供应商列表模糊匹配到 {len(matches)} 份，已选用最新：{chosen}")
    return chosen


SUPPLIER_FILE = resolve_latest(SUPPLIER_PATTERN)


def parse_period(p):
    """'25.12-26.2' / '26.3' -> ('2025-12-01','2026-02-28')"""
    p = str(p).strip()
    if "-" in p:
        a, b = p.split("-", 1)
    else:
        a = b = p

    def md(s):
        s = s.strip()
        yy, mm = s.split(".")
        return int(yy) + 2000, int(mm)

    y1, m1 = md(a)
    y2, m2 = md(b)
    start = f"{y1:04d}-{m1:02d}-01"
    last = calendar.monthrange(y2, m2)[1]
    end = f"{y2:04d}-{m2:02d}-{last:02d}"
    return start, end


def build_settlement():
    wb = load(f"{SRC_DIR}\\{SETTLEMENT_FILE}")
    ws = wb["阳光优采对账结算"]
    rows = list(ws.iter_rows(values_only=True))
    data = rows[1:]

    cur_name = None
    cur_cat = None
    groups = defaultdict(list)  # name -> [detail, ...]
    all_base = 0.0
    settled_base = 0.0
    new_profit = 0.0
    new_profit_arrived = 0.0   # 新点已收分成：仅「已到账」结算期的新点分成求和
    period_count = 0
    arrived_count = 0
    settled_periods = 0
    max_end = ""

    for r in data:
        if r[2] is None and r[3] is None:
            continue
        name = r[0] if r[0] else cur_name
        cat = r[1] if r[1] else cur_cat
        cur_name, cur_cat = name, cat

        start, end = parse_period(r[2])
        base = float(r[3] or 0)
        ratio = r[4]
        profit = float(r[5] or 0)
        sealed = r[6]   # 已用/待用
        invoiced = r[7]  # 已开/待开
        arrived = r[9]   # 已到账/暂未到账
        progress = r[10]
        cycle = r[11]
        remark = r[12]

        is_settled = sealed == "已用" or invoiced == "已开"
        all_base += base
        new_profit += profit
        period_count += 1
        if arrived == "已到账":
            arrived_count += 1
            new_profit_arrived += profit
        if is_settled:
            settled_base += base
            settled_periods += 1
        if end > max_end:
            max_end = end

        groups[name].append({
            "supplier": name,
            "category": cat,
            "start": start,
            "end": end,
            "base": round(base, 2),
            "ratio": ratio,
            "profit": round(profit, 2),
            "sealed": sealed,
            "invoiced": invoiced,
            "arrived": arrived,
            "progress": progress,
            "cycle": cycle,
            "remark": remark,
        })
    wb.close()

    profit_details = []
    for i, (name, details) in enumerate(groups.items()):
        base_total = round(sum(d["base"] for d in details), 2)
        profit_total = round(sum(d["profit"] for d in details), 2)
        arrived = sum(1 for d in details if d["arrived"] == "已到账")
        profit_details.append({
            "id": i,
            "name": name,
            "category": details[0]["category"],
            "ratioText": details[0]["ratio"],
            "count": len(details),
            "baseTotal": base_total,
            "profitTotal": profit_total,
            "arrivedCount": arrived,
            "details": details,
        })

    settled_amount = round(settled_base, 2)
    base_total_all = round(all_base, 2)
    settlement = {
        "settledAmount": settled_amount,
        "periodCount": period_count,
        "newProfit": round(new_profit, 2),
        "newProfitArrived": round(new_profit_arrived, 2),
        "arrivedCount": arrived_count,
        "arrivalRate": round(arrived_count / period_count * 100, 2) if period_count else 0,
        "settledPeriods": settled_periods,
        "baseTotal": base_total_all,
        "totalTradeAmount": base_total_all,
        "payRatio": round(settled_amount / base_total_all * 100, 2) if base_total_all else 0,
        "dataEndDate": max_end,
    }
    return settlement, profit_details


def build_zone_scale():
    # 本地供应商：供应商列表按所属专区计数
    wb = load(f"{SRC_DIR}\\{SUPPLIER_FILE}")
    ws = wb["Sheet0"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = rows[0]
    data = rows[1:]
    zone_idx = hdr.index("所属专区")
    local = Counter(str(r[zone_idx]) for r in data)
    wb.close()

    # 电商入驻：sheet1，row0=说明, row1=专区+电商列, row2+ = 各专区状态矩阵
    wb = load(f"{SRC_DIR}\\{ECOM_FILE}")
    ws = wb["Sheet1"]
    erows = list(ws.iter_rows(values_only=True))
    wb.close()
    supplier_cols = [c for c in erows[1][1:] if c is not None]
    ecom_raw = {}  # 原始专区名 -> (present, ordered)
    for r in erows[2:]:
        z = r[0]
        if z is None:
            continue
        present = sum(1 for c in r[1:] if c is not None and str(c) in ECOM_PRESENT)
        ordered = sum(1 for c in r[1:] if c is not None and str(c) in ECOM_ORDERED)
        ecom_raw[z] = (present, ordered)

    # 用显式别名对齐到本地专区名
    ecom_by_local = {}
    unmatched = []
    for z, (present, ordered) in ecom_raw.items():
        target = ZONE_ALIASES.get(z, z)
        if target in local:
            ecom_by_local[target] = (present, ordered)
        else:
            unmatched.append({"ecomZone": z, "present": present, "ordered": ordered})

    zone_scale = []
    for name, local_total in local.items():
        present, ordered = ecom_by_local.get(name, (0, 0))
        zone_scale.append({
            "name": name,
            "localTotal": local_total,
            "ecomTotal": present,
            "ecomOrdered": ordered,
        })
    zone_scale.sort(key=lambda z: -z["localTotal"])

    return zone_scale, unmatched


def main():
    settlement, profit_details = build_settlement()
    zone_scale, unmatched = build_zone_scale()

    # 数据截至：取自《供应商列表》文件名中的快照日期（如 20261110100556 -> 2026-11-10）
    m = re.search(r'(\d{4})(\d{2})(\d{2})', SUPPLIER_FILE)
    zone_data_asof = f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else ""

    # 采购人支付率：读取专区支付率 txt（每行「专区名 百分比」，如「中国煤地电子商城 95.2」）
    # 文件未列出或不存在的专区，按 100% 计（用户约定：txt 中没有的即为 100%）
    pay_map = {}
    pay_path = os.path.join(SRC_DIR, PAY_FILE)
    if os.path.exists(pay_path):
        with open(pay_path, encoding="utf-8") as pf:
            for line in pf:
                line = line.strip()
                if not line:
                    continue
                mm = re.match(r'^(.*?)\s*([0-9]+(?:\.[0-9]+)?)\s*%?\s*$', line)
                if mm:
                    pay_map[mm.group(1).strip()] = float(mm.group(2))
                else:
                    print("  [warn] 支付率行无法解析，已跳过:", line)
        for alias, target in ZONE_ALIASES.items():
            if alias in pay_map and target not in pay_map:
                pay_map[target] = pay_map[alias]
    for z in zone_scale:
        z["payRate"] = pay_map.get(z["name"], 100.0)
    unmatched_pay = [k for k in pay_map if k not in {z["name"] for z in zone_scale}]
    if unmatched_pay:
        print("  [warn] 支付率 txt 中有专区名未匹配到专区:", unmatched_pay)

    out = {
        "meta": {
            "sourceDir": SRC_DIR,
            "generatedAt": datetime.datetime.now().isoformat(timespec="seconds"),
            "sources": {
                "settlement": SETTLEMENT_FILE,
                "supplierList": SUPPLIER_FILE,
                "ecomEntry": ECOM_FILE,
            },
            "notes": [
                "结算/新点收益数据取自《阳光优采供应商结算.xlsx》；供应商分组标签与明细均来自该表真实行。",
                "各专区本地供应商总数取自《供应商列表》按「所属专区」真实计数。",
                "各专区电商入驻数取自《专区电商入驻表》，统计状态为「已入驻/需铺品（已入驻）」的单元格。",
                "本地「有订单」在源数据中无订单级明细，暂以本地供应商总数近似（见 ZoneSupplierScale 组件注释）。",
                "专区名称对齐仅经 ZONE_ALIASES 显式别名表，未做模糊匹配；未匹配电商专区见 unmatchedEcomZones。",
                "采购人支付率来自专区支付率.txt（百分比 0-100），由用户另行提供；txt 未列出的专区按 100% 计。",
            ],
            "zoneNameAliasesApplied": ZONE_ALIASES,
            "unmatchedEcomZones": unmatched,
            "unmatchedPayZones": unmatched_pay,
            "payRateSource": PAY_FILE if os.path.exists(pay_path) else None,
            "zoneDataAsOf": zone_data_asof,
        },
        "settlement": settlement,
        "profitDetails": profit_details,
        "zoneScale": zone_scale,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # 控制台摘要
    s = settlement
    print("生成成功 ->", OUT_PATH)
    print(f"  对账结算: 已结算={s['settledAmount']} 期数={s['periodCount']} 新点应收分成={s['newProfit']} "
          f"新点已收分成={s['newProfitArrived']} 到账率={s['arrivalRate']}% 收款比例={s['payRatio']}% 数据截至={s['dataEndDate']}")
    print(f"  供应商分组: {len(profit_details)} 家 / 结算期合计 {sum(p['count'] for p in profit_details)} 期")
    print(f"  专区规模: {len(zone_scale)} 个专区；本地合计 {sum(z['localTotal'] for z in zone_scale)} 家")
    print(f"  未匹配电商专区(仅出现在入驻表): {len(unmatched)} 个 -> {[u['ecomZone'] for u in unmatched]}")


if __name__ == "__main__":
    main()
