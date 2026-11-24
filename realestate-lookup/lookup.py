"""
부동산 공공데이터 조회 스크립트 (PublicDataReader 기반)

기능
  1) trade  : 국토교통부 실거래가 조회 + 평당가 계산 + 요약
  2) ledger : 지번 주소로 건축물대장(표제부·총괄표제부·지역지구구역) 핵심 항목 조회

사용 예
  python lookup.py trade --region "서울 마포구" --type 상업업무용 --months 12
  python lookup.py trade --region "성남시 분당구" --type 토지 --months 24 --dong 정자동
  python lookup.py ledger --address "서울 마포구 서교동 395-166"

서비스키: 환경변수 DATA_GO_KR_KEY 또는 같은 폴더의 .env 파일 (DATA_GO_KR_KEY=발급받은키)
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
import warnings
from pathlib import Path

import pandas as pd

warnings.filterwarnings("ignore")  # 라이브러리 내부 verify=False 경고 숨김

PYEONG = 3.305785  # 1평 = 3.305785㎡
HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "output"

# 부동산 유형별: (거래금액 외에 평당가 계산에 쓸 면적 컬럼, 화면 표시명)
AREA_COLUMNS = {
    "상업업무용": [("buildingAr", "건물면적"), ("plottageAr", "대지면적")],
    "공장창고등": [("buildingAr", "건물면적"), ("plottageAr", "대지면적")],
    "토지": [("dealArea", "거래면적")],
    "오피스텔": [("excluUseAr", "전용면적")],
    "아파트": [("excluUseAr", "전용면적")],
    "연립다세대": [("excluUseAr", "전용면적"), ("landAr", "대지권면적")],
    "단독다가구": [("totalFloorAr", "연면적"), ("plottageAr", "대지면적")],
}

KOR_COLUMNS = {
    "sggNm": "시군구", "umdNm": "법정동", "jibun": "지번", "buildingType": "건물유형",
    "buildingUse": "건물주용도", "landUse": "용도지역", "jimok": "지목", "floor": "층",
    "buildYear": "건축년도", "dealAmount": "거래금액(만원)", "buildingAr": "건물면적(㎡)",
    "plottageAr": "대지면적(㎡)", "dealArea": "거래면적(㎡)", "excluUseAr": "전용면적(㎡)",
    "landAr": "대지권면적(㎡)", "totalFloorAr": "연면적(㎡)", "offiNm": "단지명",
    "aptNm": "단지명", "mhouseNm": "단지명", "houseType": "주택유형",
    "shareDealingType": "지분거래구분", "dealingGbn": "거래유형", "slerGbn": "매도자",
    "buyerGbn": "매수자", "cdealType": "해제여부", "cdealDay": "해제사유발생일",
    "deposit": "보증금(만원)", "monthlyRent": "월세(만원)",
}


# ---------------------------------------------------------------- 공통
def load_service_key() -> str:
    key = os.environ.get("DATA_GO_KR_KEY", "").strip()
    env_file = HERE / ".env"
    if not key and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("DATA_GO_KR_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit(
            "[오류] 서비스키가 없습니다. 환경변수 DATA_GO_KR_KEY를 설정하거나\n"
            f"       {env_file} 파일에 DATA_GO_KR_KEY=발급받은키 를 저장하세요."
        )
    if not key.isascii() or len(key) < 30:
        sys.exit(
            f"[오류] .env의 서비스키가 올바르지 않습니다 (길이 {len(key)}자"
            f"{', 한글 포함 — 예시 문구가 그대로 들어간 것 같습니다' if not key.isascii() else ''}).\n"
            "       공공데이터포털 마이페이지의 '일반 인증키(Decoding)' 값을 그대로 넣으세요."
        )
    return key


_CODE_CACHE: pd.DataFrame | None = None


def code_table() -> pd.DataFrame:
    """법정동코드 표 (현재 유효한 코드만)."""
    global _CODE_CACHE
    if _CODE_CACHE is None:
        from PublicDataReader import code_bdong

        df = code_bdong()
        df = df[df["말소일자"].astype(str).str.strip() == ""].copy()
        for c in ["시도명", "시군구명", "읍면동명", "동리명", "시군구코드", "법정동코드"]:
            df[c] = df[c].astype(str).str.strip()
        _CODE_CACHE = df
    return _CODE_CACHE


def _match_region(rows: pd.DataFrame, tokens: list[str]) -> pd.DataFrame:
    """'서울', '마포구' 같은 토큰이 모두 시도명+시군구명에 포함되는 행만 남김."""
    full = rows["시도명"] + " " + rows["시군구명"]
    for t in tokens:
        t = {"서울": "서울특별시", "경기": "경기도", "인천": "인천광역시"}.get(t, t)
        rows, full = rows[full.str.contains(t, regex=False)], full[full.str.contains(t, regex=False)]
    return rows


def resolve_sigungu(region: str) -> tuple[str, str]:
    """'서울 마포구' → ('11440', '서울특별시 마포구')."""
    df = code_table()
    rows = df[(df["시군구명"] != "") & (df["읍면동명"] == "")]
    rows = _match_region(rows, region.split())
    codes = rows.drop_duplicates("시군구코드")
    if codes.empty:
        sys.exit(f"[오류] 시군구를 찾지 못했습니다: '{region}'")
    if len(codes) > 1:
        names = ", ".join(codes["시도명"] + " " + codes["시군구명"])
        sys.exit(f"[오류] '{region}'에 해당하는 시군구가 여러 개입니다. 시도를 함께 적어주세요: {names}")
    r = codes.iloc[0]
    return r["시군구코드"], f"{r['시도명']} {r['시군구명']}"


def parse_address(address: str) -> dict:
    """'서울 마포구 서교동 395-166' / '경기 양평군 양서면 목왕리 산12-3' 파싱."""
    tokens = address.split()
    if len(tokens) < 2:
        sys.exit("[오류] 주소는 '시군구 동 지번' 형식으로 입력하세요. 예: 서울 마포구 서교동 395-166")
    m = re.fullmatch(r"(산)?(\d+)(?:-(\d+))?", tokens[-1])
    if not m:
        sys.exit(f"[오류] 지번을 읽지 못했습니다: '{tokens[-1]}' (예: 395-166, 산12-3)")
    mountain, bun, ji = m.group(1), m.group(2), m.group(3) or "0"

    df = code_table()
    dong, rest = tokens[-2], tokens[:-2]
    if dong.endswith("리") and rest and rest[-1].endswith(("읍", "면")):
        rows = df[(df["동리명"] == dong) & (df["읍면동명"] == rest[-1])]
        rest = rest[:-1]
    else:
        rows = df[(df["읍면동명"] == dong) & (df["동리명"] == "")]
    rows = _match_region(rows, rest)
    if rows.empty:
        sys.exit(f"[오류] 법정동을 찾지 못했습니다: '{address}' (행정동이 아닌 법정동 이름인지 확인하세요)")
    if len(rows) > 1:
        names = ", ".join(rows["시도명"] + " " + rows["시군구명"] + " " + rows["읍면동명"])
        sys.exit(f"[오류] 같은 이름의 동이 여러 곳입니다. 시군구를 함께 적어주세요: {names}")
    code = rows.iloc[0]["법정동코드"]
    return {
        "sigungu_code": code[:5],
        "bdong_code": code[5:],
        "plat_code": "1" if mountain else "0",
        "bun": bun,
        "ji": ji,
        "label": " ".join(x for x in rows.iloc[0][["시도명", "시군구명", "읍면동명", "동리명"]] if x)
        + f" {'산' if mountain else ''}{bun}" + (f"-{ji}" if ji != "0" else ""),
    }


def save_csv(df: pd.DataFrame, name: str) -> Path:
    OUT_DIR.mkdir(exist_ok=True)
    path = OUT_DIR / f"{name}_{dt.date.today():%Y%m%d}.csv"
    df.to_csv(path, index=False, encoding="utf-8-sig")  # 엑셀에서 한글 깨짐 방지
    return path


# ---------------------------------------------------------------- 실거래가
def month_range(months: int) -> tuple[str, str]:
    today = dt.date.today().replace(day=1)
    end = today
    y, m = end.year, end.month - (months - 1)
    while m <= 0:
        y, m = y - 1, m + 12
    return f"{y}{m:02d}", f"{end:%Y%m}"


def enrich_trades(raw: pd.DataFrame, prop_type: str) -> pd.DataFrame:
    """해제거래 표시, 계약일, 평당가(만원/평) 계산 후 한글 컬럼으로 정리."""
    df = raw.copy()
    if df.empty:
        return df
    df["계약일"] = pd.to_datetime(
        dict(year=df["dealYear"], month=df["dealMonth"], day=df["dealDay"]), errors="coerce"
    ).dt.date
    df["해제거래"] = df.get("cdealType", pd.Series("", index=df.index)).astype(str).str.strip().eq("O")

    for col, label in AREA_COLUMNS.get(prop_type, []):
        if col in df.columns and "dealAmount" in df.columns:
            area = pd.to_numeric(df[col], errors="coerce")
            amount = pd.to_numeric(df["dealAmount"], errors="coerce")
            df[f"{label}당 평단가(만원/평)"] = (amount / (area / PYEONG)).where(area > 0).round(0)

    keep = ["계약일", "해제거래"] + [c for c in KOR_COLUMNS if c in df.columns]
    keep += [c for c in df.columns if c.endswith("(만원/평)")]
    out = df[keep].rename(columns=KOR_COLUMNS)
    nan_like = {"nan", "None", "<NA>", " "}
    out = out.apply(lambda s: s.where(~s.astype(str).isin(nan_like), "") if s.dtype == object else s)
    return out.sort_values("계약일", ascending=False).reset_index(drop=True)


def summarize(df: pd.DataFrame) -> pd.DataFrame:
    """해제거래를 뺀 정상거래 기준 요약."""
    valid = df[~df["해제거래"]]
    price_cols = [c for c in valid.columns if c.endswith("(만원/평)")]
    group = "건물주용도" if "건물주용도" in valid.columns else ("지목" if "지목" in valid.columns else None)
    rows = []
    groups = [("전체", valid)] + (
        [(k, g) for k, g in valid.groupby(group)] if group else []
    )
    for name, g in groups:
        row = {"구분": name, "거래건수": len(g), "거래금액 중앙값(만원)": g["거래금액(만원)"].median()}
        for c in price_cols:
            s = g[c].dropna()
            row[f"{c} 중앙값"] = s.median()
            row[f"{c} 최소"] = s.min()
            row[f"{c} 최대"] = s.max()
        rows.append(row)
    return pd.DataFrame(rows)


def cmd_trade(args: argparse.Namespace) -> None:
    from PublicDataReader import TransactionPrice

    key = load_service_key()
    sigungu_code, sigungu_label = resolve_sigungu(args.region)
    start, end = month_range(args.months)
    print(f"▶ {sigungu_label}({sigungu_code}) · {args.type} {args.trade} · {start}~{end} 조회 중...")

    api = TransactionPrice(key)
    raw = api.get_data(
        property_type=args.type, trade_type=args.trade, sigungu_code=sigungu_code,
        start_year_month=start, end_year_month=end, translate=False, verbose=False,
    )
    df = enrich_trades(raw, args.type)
    if args.dong and not df.empty:
        df = df[df["법정동"].astype(str).str.strip() == args.dong]
    if df.empty:
        print("조회된 거래가 없습니다. (기간·유형·동 이름, API 활용신청 승인 여부를 확인하세요)")
        return

    name = f"실거래_{sigungu_label.replace(' ', '')}{('_' + args.dong) if args.dong else ''}_{args.type}_{args.trade}"
    path = save_csv(df, name)
    summary = summarize(df) if args.trade == "매매" else None

    pd.set_option("display.width", 200)
    pd.set_option("display.max_columns", 20)
    print(f"\n총 {len(df)}건 (해제거래 {int(df['해제거래'].sum())}건 포함) → {path}")
    if summary is not None:
        spath = save_csv(summary, name + "_요약")
        print(f"요약 → {spath}\n")
        print(summary.to_string(index=False))
    print("\n[최근 10건]")
    print(df.head(10).to_string(index=False))


# ---------------------------------------------------------------- 건축물대장
LEDGER_FIELDS = {
    "대지위치": "platPlc", "도로명주소": "newPlatPlc", "건물명": "bldNm", "동명칭": "dongNm",
    "대장종류": "regstrKindCdNm", "주용도": "mainPurpsCdNm", "기타용도": "etcPurps",
    "구조": "strctCdNm", "지상층수": "grndFlrCnt", "지하층수": "ugrndFlrCnt",
    "대지면적(㎡)": "platArea", "건축면적(㎡)": "archArea", "연면적(㎡)": "totArea",
    "용적률산정연면적(㎡)": "vlRatEstmTotArea", "건폐율(%)": "bcRat", "용적률(%)": "vlRat",
    "세대수": "hhldCnt", "가구수": "fmlyCnt", "호수": "hoCnt",
    "옥내자주식주차": "indrAutoUtcnt", "옥외자주식주차": "oudrAutoUtcnt",
    "허가일": "pmsDay", "착공일": "stcnsDay", "사용승인일": "useAprDay",
}


def _fetch_ledger(api, ledger_type: str, addr: dict) -> pd.DataFrame:
    try:
        return api.get_data(
            ledger_type=ledger_type, sigungu_code=addr["sigungu_code"], bdong_code=addr["bdong_code"],
            plat_code=addr["plat_code"], bun=addr["bun"], ji=addr["ji"], translate=False,
        )
    except Exception as e:  # 개별 대장 실패가 전체를 막지 않도록
        print(f"  ! {ledger_type} 조회 실패: {e}")
        return pd.DataFrame()


def ledger_rows(df: pd.DataFrame, source: str) -> pd.DataFrame:
    rows = []
    for _, r in df.iterrows():
        row = {"출처": source}
        for label, col in LEDGER_FIELDS.items():
            v = str(r.get(col, "") or "").strip()
            if label.endswith("일") and re.fullmatch(r"\d{8}", v):
                v = f"{v[:4]}-{v[4:6]}-{v[6:]}"
            row[label] = "" if v in ("nan", "None") else v
        rows.append(row)
    return pd.DataFrame(rows)


def cmd_ledger(args: argparse.Namespace) -> None:
    from PublicDataReader import BuildingLedger

    key = load_service_key()
    addr = parse_address(args.address)
    print(f"▶ {addr['label']} (시군구 {addr['sigungu_code']} / 법정동 {addr['bdong_code']}) 건축물대장 조회 중...")

    api = BuildingLedger(key)
    recap = _fetch_ledger(api, "총괄표제부", addr)
    title = _fetch_ledger(api, "표제부", addr)
    zone = _fetch_ledger(api, "지역지구구역", addr)

    result = pd.concat(
        [ledger_rows(recap, "총괄표제부"), ledger_rows(title, "표제부")], ignore_index=True
    )
    if result.empty:
        print("건축물대장이 조회되지 않았습니다. (나대지·미등재 건물이거나, 지번/활용신청 승인 여부 확인 필요)")
    else:
        result = result.loc[:, (result != "").any()]  # 전부 빈 칸인 항목은 숨김
        path = save_csv(result, f"건축물대장_{addr['label'].replace(' ', '')}")
        print(f"\n건물 {len(title)}동 / 총괄표제부 {len(recap)}건 → {path}\n")
        print(result.T.to_string(header=False))

    if not zone.empty and "jijiguCdNm" in zone.columns:
        names = [str(x).strip() for x in zone["jijiguCdNm"].tolist() + zone.get("etcJijigu", pd.Series()).tolist()]
        names = sorted({n for n in names if n and n not in ("nan", "None")})
        print("\n[지역·지구·구역] " + (", ".join(names) if names else "정보 없음"))

    print(
        "\n※ 위반건축물 여부는 이 API에 포함되지 않습니다. 정부24·세움터에서 건축물대장 원본(갑지 상단 '위반건축물' 표기)을 확인하세요."
    )


# ---------------------------------------------------------------- CLI
def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="부동산 공공데이터 조회 (실거래가 / 건축물대장)")
    sub = p.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("trade", help="실거래가 조회")
    t.add_argument("--region", required=True, help='시군구. 예: "서울 마포구", "성남시 분당구"')
    t.add_argument("--type", default="상업업무용", choices=list(AREA_COLUMNS) + ["분양입주권"])
    t.add_argument("--trade", default="매매", choices=["매매", "전월세"])
    t.add_argument("--months", type=int, default=12, help="최근 몇 개월 (기본 12)")
    t.add_argument("--dong", help="법정동으로 좁히기. 예: 서교동")
    t.set_defaults(func=cmd_trade)

    l = sub.add_parser("ledger", help="건축물대장 조회")
    l.add_argument("--address", required=True, help='지번 주소. 예: "서울 마포구 서교동 395-166"')
    l.set_defaults(func=cmd_ledger)

    args = p.parse_args(argv)
    if getattr(args, "type", None) in ("상업업무용", "토지", "공장창고등", "분양입주권") and args.trade == "전월세":
        sys.exit(f"[오류] {args.type}은(는) 전월세 데이터를 제공하지 않습니다.")
    args.func(args)


if __name__ == "__main__":
    main()
