# 종목 표시 JSON 생성·검증 경로 (v5.3e 복구) — GrokBot 자체 검증

## 데이터 흐름
```
[외부 원천] FunETF NAV/분배 응답, ZeroIn 메타 (112종: 2026-10-02 기준, 82종: 업로드 증거 변환본 2026-10-08)   ← 수집 스크립트: 저장소에 없음(미확인)
      │  변환(원천 → 입력 번들). 112종 변환 스크립트: 저장소에 없음(미확인). 82종: "ETF82-readonly-conversion-v1"(스크립트 미확인)
      ▼
inputs/<code>.json  {meta, ticker, manifest, nav_rows, distribution_rows, zeroin_metadata}      (data/runtime-manifest.json files[] 에 sha256)
      │  pipeline/restore_etf82_inputs.py  (82종만, 1회성 복구: manifest/meta 를 2026-10-12 실제 Core 실행 기록값으로 복원)
      ▼
runtime_source.zip: period_bridge.run_period(번들, 시작, 종료) → 원본 adapter.vm → candidate8 Core(long_term_health)
      │  = periods[기간]  (status, metadata, health, series, performance, distribution, cache, proof_meta, ...)
      ▼
presentation.py: detail_presentation(periods[기간], 번들) (+ facts_projection.py)
      │  = presentations[기간] {reinvestment_effect_pp, health_display, distribution_history, distribution_recent12, facts}
      ▼
data/<code>.json {snapshot(=catalog), ticker, periods, presentations[, core_note]}      ← pipeline/build_ticker_json.py
      ▼
UI: phase-data.js(고정기간: data/<code>.json 읽음) / phase-worker.js(직접지정: inputs + runtime_source.zip + presentation.py 를 Pyodide 로 같은 함수 실행)
    → real-detail.js, sections13-display.js(분배), sections45-display.js(MDD·시장), facts-display.js(팩트)
```

## 재현 실행
```
python3 pipeline/restore_etf82_inputs.py . <c3f21ae 의 data 디렉터리>    # 이미 적용됨. 다시 돌리면 0건(멱등)
python3 pipeline/build_ticker_json.py . /tmp/gen                          # 194종 생성(약 30초)
python3 pipeline/compare_json.py data /tmp/gen                            # 배포본과 바이트 비교 → 194/194 동일이어야 함
python3 pipeline/validate_json.py . /tmp/gen                              # 자동 검증(PASS/FAIL/SKIP)
python3 pipeline/diagnose_fields.py <이전 data> data inputs               # 필드별 결손 진단(112/82)
```
- 배포 갱신: `python3 pipeline/build_ticker_json.py . data` 후 compare/validate.
- 계산식은 새로 만들지 않음. 금융 계산은 원본 adapter/Core 안에서만 일어남.
- 필요 환경: Python 3.11+ (표준 라이브러리만, sqlite3 포함).
