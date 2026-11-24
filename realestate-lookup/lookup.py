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


SUMMARY_GROUPS = {
    "상업업무용": ["건물유형", "건물주용도"],
    "공장창고등": ["건물유형", "건물주용도"],
    "토지": ["용도지역", "지목"],
}


def mark_exclusions(df: pd.DataFrame, include_direct: bool) -> pd.DataFrame:
    """요약에서 뺄 거래에 사유를 표시 (원본 거래는 그대로 남김)."""
    df = df.copy()
    reasons = pd.Series("", index=df.index)

    def add(mask, text):
        nonlocal reasons
        reasons = reasons.where(~mask, (reasons + ", " + text).str.lstrip(", "))

    add(df["해제거래"], "해제거래")
    if "지분거래구분" in df.columns:
        add(df["지분거래구분"].astype(str).str.strip().ne(""), "지분거래")
    if not include_direct and "거래유형" in df.columns:
        add(df["거래유형"].astype(str).str.strip().eq("직거래"), "직거래")
    df.insert(2, "요약제외사유", reasons)
    return df


def summarize(df: pd.DataFrame, prop_type: str) -> pd.DataFrame:
    """요약제외사유가 없는 거래만으로 그룹별 건수·평단가 요약."""
    valid = df[df["요약제외사유"] == ""]
    price_cols = [c for c in valid.columns if c.endswith("(만원/평)")]
    keys = [k for k in SUMMARY_GROUPS.get(prop_type, ["법정동"]) if k in valid.columns]

    def stats(level1, level2, g):
        row = {"구분1": level1, "구분2": level2, "거래건수": len(g),
               "거래금액 중앙값(만원)": g["거래금액(만원)"].median() if len(g) else None}
        for c in price_cols:
            s = pd.to_numeric(g[c], errors="coerce").dropna()
            label = c.replace(" 평단가(만원/평)", "")
            row[f"{label} 평단가 중앙값"] = s.median() if len(s) else None
            row[f"{label} 평단가 최소"] = s.min() if len(s) else None
            row[f"{label} 평단가 최대"] = s.max() if len(s) else None
        return row

    rows = [stats("전체(참고·유형 혼합)" if "건물유형" in keys else "전체", "", valid)]
    if keys:
        for k1, g1 in valid.groupby(keys[0], sort=True):
            rows.append(stats(k1 or "(미상)", "소계" if len(keys) > 1 else "", g1))
            if len(keys) > 1:
                for k2, g2 in g1.groupby(keys[1], sort=True):
                    rows.append(stats(k1 or "(미상)", k2 or "(미상)", g2))
    out = pd.DataFrame(rows)
    num = out.select_dtypes("number").columns
    out[num] = out[num].round(0)
    return out


def save_excel(sheets: dict, name: str) -> Path:
    """시트별 저장 + 열 너비·필터·틀고정. openpyxl이 없으면 CSV로 대체."""
    OUT_DIR.mkdir(exist_ok=True)
    try:
        import openpyxl  # noqa: F401
    except ImportError:
        print("  (openpyxl 미설치 → CSV로 저장합니다. 엑셀 파일을 원하면: pip install openpyxl)")
        for sheet, df in sheets.items():
            path = save_csv(df, f"{name}_{sheet}")
        return path
    path = OUT_DIR / f"{name}_{dt.date.today():%Y%m%d}.xlsx"
    with pd.ExcelWriter(path, engine="openpyxl") as xw:
        for sheet, df in sheets.items():
            df.to_excel(xw, sheet_name=sheet, index=False)
            ws = xw.sheets[sheet]
            if len(df.columns) > 1:
                ws.auto_filter.ref = ws.dimensions
                ws.freeze_panes = "B2"
            for i, col in enumerate(df.columns, start=1):
                width = max([len(str(col))] + [len(str(v)) for v in df[col].head(300)]) * 1.6 + 2
                ws.column_dimensions[ws.cell(1, i).column_letter].width = min(max(width, 8), 60)
                if "만원" in str(col) or "평단가" in str(col):
                    for cell in ws.iter_cols(min_col=i, max_col=i, min_row=2):
                        for c in cell:
                            c.number_format = "#,##0"
    return path


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

    df = mark_exclusions(df, args.include_direct)
    excluded = df[df["요약제외사유"] != ""]
    name = f"실거래_{sigungu_label.replace(' ', '')}{('_' + args.dong) if args.dong else ''}_{args.type}_{args.trade}"
    conditions = pd.DataFrame([
        ("조회일", f"{dt.date.today():%Y-%m-%d}"),
        ("지역", f"{sigungu_label} ({sigungu_code})" + (f" / {args.dong}" if args.dong else "")),
        ("유형", f"{args.type} {args.trade}"),
        ("기간(계약월)", f"{start} ~ {end}"),
        ("전체 거래", f"{len(df)}건"),
        ("요약 반영", f"{len(df) - len(excluded)}건"),
        ("요약 제외", f"{len(excluded)}건 (" + ", ".join(
            f"{k} {v}" for k, v in excluded["요약제외사유"].str.split(", ").explode().value_counts().items()) + ")"
            if len(excluded) else "0건"),
        ("직거래 처리", "요약에 포함" if args.include_direct else "요약에서 제외 (--include-direct로 포함 가능)"),
        ("평단가 계산", "거래금액(만원) ÷ (면적㎡ ÷ 3.305785)"),
        ("주의 1", "최근 1~2개월은 신고기한(계약 후 30일) 때문에 거래가 덜 집계됨"),
        ("주의 2", "집합건물(호실 거래)의 대지면적은 비어 있어 대지 기준 평단가가 없음"),
        ("주의 3", "같은 날·같은 지번 다건 거래는 분양·일괄매각일 수 있으니 거래 시트에서 따로 확인"),
        ("출처", "국토교통부 실거래가 공개시스템 Open API (공공데이터포털)"),
    ], columns=["항목", "내용"])

    sheets = {"조건": conditions, "거래": df}
    summary = None
    if args.trade == "매매":
        summary = summarize(df, args.type)
        sheets = {"요약": summary, **sheets}
    path = save_excel(sheets, name)

    pd.set_option("display.width", 160)
    pd.set_option("display.max_columns", 12)
    print(f"\n총 {len(df)}건 · 요약 반영 {len(df) - len(excluded)}건 · 제외 {len(excluded)}건")
    print(f"저장 → {path}")
    if summary is not None:
        cols = [c for c in summary.columns if not c.endswith(("최소", "최대"))]
        print("\n[요약 — 중앙값 기준, 최소·최대는 파일 참고]")
        print(summary[cols].to_string(index=False))
    show = [c for c in ["계약일", "요약제외사유", "법정동", "지번", "건물유형", "건물주용도", "거래금액(만원)",
                        "건물면적당 평단가(만원/평)", "거래유형"] if c in df.columns]
    print("\n[최근 10건]")
    print(df[show].head(10).to_string(index=False))


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
    """라이브러리 get_data 대신 직접 호출: https·타임아웃·재시도, 실패 시 서버 메시지 표시."""
    import time

    import requests
    import xmltodict

    url = api.meta_dict[ledger_type]["url"].replace("http://", "https://")
    key = api.service_key
    params = {
        "serviceKey": key, "sigunguCd": addr["sigungu_code"], "bjdongCd": addr["bdong_code"],
        "platGbCd": addr["plat_code"], "bun": addr["bun"].zfill(4), "ji": addr["ji"].zfill(4),
        "numOfRows": 100, "pageNo": 1,
    }
    rows: list[dict] = []
    while True:
        res, last_err = None, ""
        for attempt in range(3):  # 서버가 간헐적으로 느리거나 오류를 내므로 재시도
            try:
                res = requests.get(url, params=params, timeout=40)
                if res.status_code == 200 and "<resultCode>" in res.text:
                    break
                last_err = f"HTTP {res.status_code}: {' '.join(res.text.split())[:200]}"
            except requests.RequestException as e:
                last_err = str(e).replace(key, "***")[:200]
            res = None
            time.sleep(2 * (attempt + 1))
        if res is None:
            print(f"  ! {ledger_type} 조회 실패 (3회 시도): {last_err}")
            return pd.DataFrame(rows)
        body = xmltodict.parse(res.text)["response"]
        code = body["header"]["resultCode"]
        if code not in ("00", "000"):
            print(f"  ! {ledger_type} 조회 실패: {code} {body['header'].get('resultMsg')}")
            return pd.DataFrame(rows)
        items = (body.get("body") or {}).get("items") or {}
        item = items.get("item") if isinstance(items, dict) else None
        rows += item if isinstance(item, list) else ([item] if item else [])
        total = int((body.get("body") or {}).get("totalCount") or 0)
        if len(rows) >= total or not item:
            return pd.DataFrame(rows)
        params["pageNo"] += 1
        time.sleep(1)


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


# ---------------------------------------------------------------- 키 저장
def _read_clipboard() -> str:
    import subprocess

    for cmd in (["pbpaste"], ["xclip", "-o", "-selection", "clipboard"], ["powershell", "-command", "Get-Clipboard"]):
        try:
            return subprocess.run(cmd, capture_output=True, text=True, timeout=5).stdout
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    return ""


def cmd_setkey(args: argparse.Namespace) -> None:
    """명령 실행 → 브라우저에서 키 복사 → Enter 순서라 클립보드가 명령어로 덮이지 않음."""
    for attempt in range(1, 4):
        input(
            f"\n[{attempt}/3] 공공데이터포털 '인증키 발급현황'에서 일반 인증키(Decoding)를 복사(⌘+C)한 뒤,\n"
            "      이 터미널로 돌아와 Enter만 누르세요 (붙여넣기 하지 마세요): "
        )
        key = "".join(_read_clipboard().split())
        if key.isascii() and 30 <= len(key) <= 200 and re.fullmatch(r"[A-Za-z0-9+/=%_-]+", key):
            (HERE / ".env").write_text(f"DATA_GO_KR_KEY={key}\n", encoding="utf-8")
            print(f"✔ 저장했습니다: {key[:4]}…{key[-2:]} ({len(key)}자) → {HERE / '.env'}")
            return
        preview = key[:12] + ("…" if len(key) > 12 else "")
        print(f"✘ 클립보드 내용이 인증키가 아닙니다: '{preview}' ({len(key)}자). 키 값만 다시 복사해 주세요.")
    sys.exit("[중단] 3회 실패. 인증키 발급현황 화면을 확인해 주세요.")


# ---------------------------------------------------------------- 진단
def cmd_check(args: argparse.Namespace) -> None:
    """API별로 직접 1건 요청해 상태코드와 서버 메시지를 보여줌 (키 값은 출력하지 않음)."""
    import requests

    key = load_service_key()
    last_month = (dt.date.today().replace(day=1) - dt.timedelta(days=1)).strftime("%Y%m")
    tests = [
        ("상업업무용 실거래가", "https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",
         {"LAWD_CD": "11440", "DEAL_YMD": last_month, "numOfRows": "1"}),
        ("건축물대장 표제부", "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo",
         {"sigunguCd": "11440", "bjdongCd": "12000", "numOfRows": "1"}),
    ]
    print(f"키: {key[:4]}…{key[-2:]} ({len(key)}자)")
    for name, url, params in tests:
        try:
            r = requests.get(url, params={"serviceKey": key, **params}, timeout=30)
            body = " ".join(r.text.split())[:250]
            print(f"\n[{name}] HTTP {r.status_code}\n  {body}")
        except Exception as e:
            print(f"\n[{name}] 연결 실패: {str(e).replace(key, '***')[:250]}")
    print(
        "\n해석: 200 + <resultCode>00 → 정상 / 403 Forbidden → 해당 API 미신청 또는 승인 반영 대기 /"
        " 401·SERVICE_KEY_IS_NOT_REGISTERED → 키 오류"
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
    t.add_argument("--include-direct", action="store_true", help="직거래도 요약에 포함 (기본: 제외)")
    t.set_defaults(func=cmd_trade)

    l = sub.add_parser("ledger", help="건축물대장 조회")
    l.add_argument("--address", required=True, help='지번 주소. 예: "서울 마포구 서교동 395-166"')
    l.set_defaults(func=cmd_ledger)

    k = sub.add_parser("setkey", help="클립보드의 공공데이터포털 인증키를 .env에 저장")
    k.set_defaults(func=cmd_setkey)

    c = sub.add_parser("check", help="API 연결 진단 (상태코드·서버 메시지 확인)")
    c.set_defaults(func=cmd_check)

    args = p.parse_args(argv)
    if getattr(args, "type", None) in ("상업업무용", "토지", "공장창고등", "분양입주권") and args.trade == "전월세":
        sys.exit(f"[오류] {args.type}은(는) 전월세 데이터를 제공하지 않습니다.")
    args.func(args)


if __name__ == "__main__":
    main()
