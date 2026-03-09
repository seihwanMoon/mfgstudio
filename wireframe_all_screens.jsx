import { useState } from "react";

/* ═══════════════════════════════════════════════════════
   MANUFACTURING AI STUDIO — 전체 화면 와이어프레임
   PyCaret 3.0 + MLflow 2.11
   9개 화면 완전 인터랙티브
═══════════════════════════════════════════════════════ */

// ── DESIGN TOKENS ─────────────────────────────────────
const T = {
  bg:       "#080F1A",
  bgCard:   "#0D1926",
  bgPanel:  "#111E2E",
  bgHover:  "#162436",
  navy:     "#0B1929",
  border:   "#1A3352",
  borderHi: "#234466",
  cyan:     "#38BDF8",
  cyanDim:  "#38BDF820",
  green:    "#34D399",
  greenDim: "#34D39920",
  amber:    "#FBBF24",
  amberDim: "#FBBF2420",
  violet:   "#A78BFA",
  violetDim:"#A78BFA20",
  red:      "#F87171",
  redDim:   "#F8717120",
  white:    "#E2EEFF",
  mid:      "#8BA8C8",
  muted:    "#3D5A78",
  font:     "'DM Sans', 'Malgun Gothic', sans-serif",
  mono:     "'JetBrains Mono', 'Consolas', monospace",
};

// ── NAV CONFIG ────────────────────────────────────────
const SCREENS = [
  { id:"home",    label:"홈 대시보드",    short:"HOME",    icon:"⬡", color:T.cyan,   phase:"운영" },
  { id:"upload",  label:"데이터 업로드",  short:"DATA",    icon:"↑", color:T.cyan,   phase:"DATA" },
  { id:"setup",   label:"실험 설정",      short:"SETUP",   icon:"⚙", color:T.cyan,   phase:"SETUP" },
  { id:"compare", label:"모델 비교",      short:"COMPARE", icon:"⇄", color:T.amber,  phase:"TRAIN" },
  { id:"tune",    label:"학습·튜닝",      short:"TUNE",    icon:"◎", color:T.amber,  phase:"TRAIN" },
  { id:"analyze", label:"모델 분석",      short:"ANALYZE", icon:"◈", color:T.violet, phase:"EVAL" },
  { id:"finalize",label:"모델 확정",      short:"DEPLOY",  icon:"✓", color:T.green,  phase:"DEPLOY" },
  { id:"predict", label:"예측 실행",      short:"PREDICT", icon:"▶", color:T.green,  phase:"DEPLOY" },
  { id:"mlflow",  label:"MLflow 관리",    short:"MLOPS",   icon:"≡", color:T.mid,    phase:"OPS" },
];

// ── PRIMITIVE COMPONENTS ──────────────────────────────
const Box = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ boxSizing:"border-box", ...style }}>{children}</div>
);

const Label = ({ text, color = T.cyan, style = {} }) => (
  <div style={{
    fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
    color, textTransform: "uppercase", ...style
  }}>{text}</div>
);

const Chip = ({ text, color = T.cyan }) => (
  <span style={{
    fontFamily: T.mono, fontSize: 9, padding: "2px 8px", borderRadius: 3,
    border: `1px solid ${color}55`, color, background: `${color}12`,
    whiteSpace: "nowrap",
  }}>{text}</span>
);

const ApiTag = ({ method = "GET", path, color = T.green }) => (
  <div style={{ display:"flex", alignItems:"center", gap: 5, marginTop: 4 }}>
    <span style={{
      fontFamily: T.mono, fontSize: 8, fontWeight:700, padding:"1px 5px",
      background: method==="POST" ? T.amberDim : method==="WS" ? T.violetDim : T.cyanDim,
      color: method==="POST" ? T.amber : method==="WS" ? T.violet : T.cyan,
      borderRadius: 2, border:`1px solid ${method==="POST" ? T.amber : method==="WS" ? T.violet : T.cyan}44`,
    }}>{method}</span>
    <span style={{ fontFamily: T.mono, fontSize: 9, color: T.mid }}>{path}</span>
  </div>
);

const CompBox = ({ label, children, color = T.border, style = {} }) => (
  <Box style={{
    border: `1px dashed ${color}`, borderRadius: 5,
    position: "relative", ...style
  }}>
    <div style={{
      position:"absolute", top:-9, left:8, background:T.bg,
      fontFamily:T.mono, fontSize:8, color, padding:"0 4px",
      letterSpacing:"0.1em",
    }}>{label}</div>
    {children}
  </Box>
);

const Row = ({ children, gap = 10, style = {} }) => (
  <div style={{ display:"flex", gap, ...style }}>{children}</div>
);

const Col = ({ children, gap = 8, flex, style = {} }) => (
  <div style={{ display:"flex", flexDirection:"column", gap, flex, ...style }}>{children}</div>
);

const Divider = ({ style={} }) => (
  <div style={{ borderTop:`1px solid ${T.border}`, ...style }} />
);

// Fake table row
const TR = ({ cols, highlight, color = T.mid }) => (
  <div style={{
    display:"grid", gridTemplateColumns:`3fr ${" 1fr".repeat(cols.length-1)}`,
    padding:"5px 8px", alignItems:"center",
    background: highlight ? `${color}14` : "transparent",
    borderBottom:`1px solid ${T.border}`,
  }}>
    {cols.map((c,i) => (
      <span key={i} style={{
        fontFamily:T.mono, fontSize:10,
        color: i===0 ? T.white : highlight && i===1 ? color : T.mid,
        fontWeight: highlight && i===1 ? 700 : 400,
      }}>{c}</span>
    ))}
  </div>
);

// Fake form field
const Field = ({ label, type="text", value, color=T.cyan }) => (
  <Col gap={3}>
    <Label text={label} color={T.muted} />
    <div style={{
      background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:4,
      padding:"7px 10px", fontSize:11, color:T.white, fontFamily:T.font,
      display:"flex", justifyContent:"space-between", alignItems:"center",
    }}>
      <span>{value}</span>
      {type==="select" && <span style={{color:T.muted, fontSize:9}}>▾</span>}
      {type==="toggle" && (
        <div style={{
          width:28, height:15, borderRadius:8,
          background:value==="ON" ? color : T.border,
          position:"relative",
        }}>
          <div style={{
            width:11, height:11, borderRadius:"50%", background:"#fff",
            position:"absolute", top:2, left:value==="ON"?14:2, transition:"left .2s",
          }}/>
        </div>
      )}
    </div>
  </Col>
);

const Slider = ({ label, val, max=100, color=T.cyan }) => (
  <Col gap={3}>
    <Row style={{justifyContent:"space-between"}}>
      <Label text={label} color={T.muted} />
      <Label text={`${val}`} color={color} />
    </Row>
    <div style={{height:4, background:T.border, borderRadius:2}}>
      <div style={{height:"100%", width:`${(val/max)*100}%`, background:color, borderRadius:2}}/>
    </div>
  </Col>
);

const Btn = ({ label, color=T.cyan, outline=false, small=false, full=false }) => (
  <div style={{
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    padding: small?"5px 12px":"8px 18px",
    background: outline ? "transparent" : color,
    border: `1px solid ${color}`,
    borderRadius: 5, cursor:"pointer",
    color: outline ? color : T.bg,
    fontSize: small ? 10 : 12, fontWeight:700,
    fontFamily:T.font, width:full?"100%":"auto",
    whiteSpace:"nowrap",
  }}>{label}</div>
);

// Progress bar
const Bar = ({ pct, color=T.cyan, label, h=6 }) => (
  <Col gap={2}>
    {label && <Row style={{justifyContent:"space-between"}}>
      <span style={{fontSize:10,color:T.mid}}>{label}</span>
      <span style={{fontSize:10,color}}>{pct}%</span>
    </Row>}
    <div style={{height:h, background:T.border, borderRadius:3}}>
      <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3}}/>
    </div>
  </Col>
);

const StatCard = ({ label, value, sub, color=T.cyan }) => (
  <Box style={{
    background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 14px", flex:1,
  }}>
    <Label text={label} color={T.muted} style={{marginBottom:4}}/>
    <div style={{fontSize:22, fontWeight:800, color, lineHeight:1.1}}>{value}</div>
    {sub && <div style={{fontSize:10, color:T.muted, marginTop:4}}>{sub}</div>}
  </Box>
);

// Mini radar (SVG)
const Radar = ({ color=T.cyan }) => {
  const pts = [
    [50,10],[83,32],[70,72],[30,72],[17,32]
  ];
  const inner = pts.map(([x,y])=>[
    50+(x-50)*0.6, 50+(y-50)*0.6
  ]);
  const toStr = arr => arr.map(p=>p.join(",")).join(" ");
  return (
    <svg viewBox="0 0 100 90" width="100%" height="100%">
      {[1,0.8,0.6,0.4,0.2].map((s,i)=>(
        <polygon key={i} points={toStr(pts.map(([x,y])=>[50+(x-50)*s,50+(y-50)*s]))}
          fill="none" stroke={T.border} strokeWidth="0.8"/>
      ))}
      <polygon points={toStr(inner)} fill={`${color}25`} stroke={color} strokeWidth="1.5"/>
      {inner.map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="2.5" fill={color}/>
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════
//  SCREEN 1 — 홈 대시보드
// ═══════════════════════════════════════════════════════
function S_Home({ goto }) {
  const [sel, setSel] = useState(0);
  const models = [
    { name:"불량예측_모델", type:"분류", color:T.cyan, algo:"LightGBM", ver:"v3", acc:"92.4%", metric:"Accuracy", drift:12, today:342, status:"ok" },
    { name:"수율예측_모델", type:"회귀", color:T.amber, algo:"CatBoost", ver:"v1", acc:"0.873", metric:"R²", drift:44, today:48, status:"warn" },
    { name:"설비고장_모델", type:"이상탐지", color:T.violet, algo:"IsolationForest", ver:"v2", acc:"—", metric:"Contam.", drift:71, today:1440, status:"danger" },
    { name:"수요예측_모델", type:"시계열", color:T.green, algo:"ARIMA", ver:"v4", acc:"18.3", metric:"MAE↓", drift:8, today:4, status:"ok" },
  ];
  const m = models[sel];

  return (
    <Col gap={0} style={{height:"100%"}}>
      {/* Staging alert */}
      <Box style={{background:"#0D1F0A", borderBottom:`1px solid #1A3A12`, padding:"7px 20px"}}>
        <Row gap={12} style={{alignItems:"center"}}>
          <Label text="STAGING 대기" color={T.green}/>
          <span style={{fontSize:11,color:T.green}}>불량예측_v4</span>
          <span style={{fontSize:10,color:T.mid}}>XGBoost / Accuracy 91.8% → 현재 92.4% 비교 필요</span>
          <Btn label="승격 →" color={T.green} small outline/>
          <span style={{fontSize:10,color:T.mid,marginLeft:8}}>수율예측_v2</span>
          <span style={{fontSize:10,color:T.mid}}>LightGBM / R² 0.891 → 현재 0.873 개선</span>
          <Btn label="승격 →" color={T.amber} small outline/>
        </Row>
      </Box>

      <Row gap={0} style={{flex:1, overflow:"hidden"}}>
        {/* Left: model grid */}
        <Col gap={0} style={{width:"52%", borderRight:`1px solid ${T.border}`, overflow:"auto"}}>
          <Box style={{padding:"16px 20px 12px", borderBottom:`1px solid ${T.border}`}}>
            <Row style={{justifyContent:"space-between", alignItems:"center"}}>
              <Col gap={2}>
                <Label text="운영 중인 모델" color={T.white} style={{fontSize:12}}/>
                <span style={{fontSize:10,color:T.muted}}>4개 모델 동시 서비스 · 카드 클릭 → 상세</span>
              </Col>
              <Row gap={8}>
                <Btn label="+ 새 모델" color={T.cyan} small/>
                <Btn label="전체 분석" color={T.mid} small outline/>
              </Row>
            </Row>
          </Box>
          <Box style={{padding:16, flex:1}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
              {models.map((m,i) => (
                <CompBox key={i} label={`ModelCard · ${m.type}`} color={m.color}
                  style={{padding:14, cursor:"pointer", background: sel===i?`${m.color}0A`:T.bgCard,
                    border:`1px solid ${sel===i?m.color:T.border}`, borderTop:`3px solid ${m.color}`,
                  }}
                  onClick={()=>setSel(i)}>
                  <Row style={{justifyContent:"space-between",marginBottom:8,alignItems:"flex-start"}}>
                    <Col gap={3}>
                      <Row gap={5}>
                        <Chip text={m.type} color={m.color}/>
                        <span style={{fontSize:9,color:T.muted}}>{m.ver}</span>
                      </Row>
                      <span style={{fontSize:12,fontWeight:700,color:T.white}}>{m.name}</span>
                      <span style={{fontSize:9,color:T.muted}}>{m.algo}</span>
                    </Col>
                    {m.status==="danger" && <span style={{fontSize:9,background:T.redDim,color:T.red,padding:"2px 6px",borderRadius:10,border:`1px solid ${T.red}44`}}>⚠ 5</span>}
                    {m.status==="warn" && <span style={{fontSize:9,background:T.amberDim,color:T.amber,padding:"2px 6px",borderRadius:10,border:`1px solid ${T.amber}44`}}>⚠ 2</span>}
                  </Row>
                  <Row gap={12} style={{marginBottom:10}}>
                    <Col gap={2}>
                      <Label text={m.metric} color={T.muted} style={{fontSize:8}}/>
                      <span style={{fontSize:18,fontWeight:800,color:m.color}}>{m.acc}</span>
                    </Col>
                    <Col gap={2}>
                      <Label text="오늘 예측" color={T.muted} style={{fontSize:8}}/>
                      <span style={{fontSize:18,fontWeight:800,color:T.white}}>{m.today.toLocaleString()}<span style={{fontSize:10,color:T.muted,fontWeight:400}}>건</span></span>
                    </Col>
                  </Row>
                  <Col gap={2}>
                    <Row style={{justifyContent:"space-between"}}>
                      <Label text="DRIFT" color={T.muted} style={{fontSize:8}}/>
                      <span style={{fontSize:9,color:m.drift>40?T.red:m.drift>20?T.amber:T.green}}>
                        {m.drift}% {m.drift>40?"위험":m.drift>20?"주의":"정상"}
                      </span>
                    </Row>
                    <div style={{height:4,background:T.border,borderRadius:2}}>
                      <div style={{height:"100%",width:`${m.drift}%`,background:m.drift>40?T.red:m.drift>20?T.amber:T.green,borderRadius:2}}/>
                    </div>
                  </Col>
                </CompBox>
              ))}
            </div>

            {/* Architecture note */}
            <CompBox label="MultiModelServingNote" color={T.muted} style={{marginTop:12,padding:"10px 14px"}}>
              <Row gap={8} style={{alignItems:"center"}}>
                <span style={{fontSize:10,color:T.mid}}>서빙 구조:</span>
                <code style={{fontFamily:T.mono,fontSize:9,color:T.cyan}}>POST /api/predict/{"{"}{m.name}{"}"}</code>
                <span style={{fontSize:10,color:T.muted}}>→</span>
                <code style={{fontFamily:T.mono,fontSize:9,color:T.amber}}>predict_model(load_model(name), data)</code>
              </Row>
            </CompBox>
          </Box>
        </Col>

        {/* Right: detail panel */}
        <Col gap={0} style={{flex:1}}>
          <Box style={{padding:"14px 18px", borderBottom:`1px solid ${T.border}`, background:T.bgPanel}}>
            <Row gap={10} style={{alignItems:"center"}}>
              <Box style={{width:30,height:30,background:m.color+"22",border:`1px solid ${m.color}55`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:m.color}}>
                {m.type[0]}
              </Box>
              <Col gap={2}>
                <span style={{fontSize:13,fontWeight:700,color:T.white}}>{m.name}</span>
                <span style={{fontSize:10,color:T.muted}}>{m.algo} · {m.ver}</span>
              </Col>
              <span style={{marginLeft:"auto",fontSize:9,color:T.green,background:T.greenDim,border:`1px solid ${T.green}44`,padding:"3px 10px",borderRadius:10,fontWeight:700}}>● Production</span>
            </Row>
          </Box>

          {/* Tabs */}
          <Box style={{background:T.bgPanel}}>
            <Row gap={0}>
              {["예측 실행","모델 정보","드리프트","버전 관리"].map((t,i)=>(
                <div key={i} style={{padding:"9px 16px",fontSize:11,color:i===0?m.color:T.muted,borderBottom:`2px solid ${i===0?m.color:"transparent"}`,cursor:"pointer"}}>{t}</div>
              ))}
            </Row>
            <Divider/>
          </Box>

          <Col gap={12} style={{padding:18, flex:1, overflow:"auto"}}>
            <ApiTag method="POST" path={`/api/predict/{model_name}`}/>
            <CompBox label="PredictEndpointCard" color={T.green} style={{padding:12}}>
              <Row gap={8}>
                {[["오늘 예측",`${m.today}건`],["누적",`${(m.today*180).toLocaleString()}건`],["마지막","3분 전"]].map(([k,v],i)=>(
                  <Box key={i} style={{flex:1,background:T.bgCard,borderRadius:5,padding:"8px 10px"}}>
                    <Label text={k} color={T.muted} style={{fontSize:8,marginBottom:3}}/>
                    <span style={{fontSize:13,fontWeight:700,color:T.white}}>{v}</span>
                  </Box>
                ))}
              </Row>
            </CompBox>
            <Row gap={8}>
              <Btn label="단건 예측" color={m.color} full/>
              <Btn label="배치 예측" color={m.color} outline full/>
              <Btn label="실시간" color={m.color} outline full/>
            </Row>
            <Divider/>
            <CompBox label="DriftGaugeWidget" color={m.drift>40?T.red:m.drift>20?T.amber:T.green} style={{padding:12}}>
              <Bar pct={m.drift} color={m.drift>40?T.red:m.drift>20?T.amber:T.green} label="드리프트 점수" h={8}/>
              {m.drift>20 && <Box style={{marginTop:8}}><Btn label="↻ 재학습하기" color={T.red} full small/></Box>}
            </CompBox>
            <CompBox label="VersionTimeline" color={T.muted} style={{padding:12}}>
              {["v3 ● Production","v2 ○ Archived","v1 ○ Archived"].map((v,i)=>(
                <Row key={i} style={{justifyContent:"space-between",padding:"6px 0",borderBottom:i<2?`1px solid ${T.border}`:"none"}}>
                  <span style={{fontSize:11,color:i===0?m.color:T.muted}}>{v}</span>
                  {i>0 && <Btn label="롤백" color={T.muted} small outline/>}
                </Row>
              ))}
            </CompBox>
          </Col>
        </Col>
      </Row>
    </Col>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 2 — 데이터 업로드
// ═══════════════════════════════════════════════════════
function S_Upload({ goto }) {
  const cols = [
    { name:"온도(°C)", type:"숫자", missing:"0%", unique:842, color:T.cyan },
    { name:"압력(bar)", type:"숫자", missing:"0%", unique:631, color:T.cyan },
    { name:"공정구분", type:"범주", missing:"2.1%", unique:4, color:T.amber },
    { name:"설비ID", type:"범주", missing:"0%", unique:12, color:T.amber },
    { name:"생산일시", type:"날짜", missing:"0%", unique:3200, color:T.violet },
    { name:"불량여부", type:"범주", missing:"0%", unique:2, color:T.green },
  ];
  return (
    <Col gap={0} style={{height:"100%"}}>
      <Row gap={0} style={{flex:1, overflow:"hidden"}}>
        {/* Left main */}
        <Col gap={0} style={{flex:1, borderRight:`1px solid ${T.border}`, overflow:"auto"}}>
          <Box style={{padding:20}}>
            {/* Dropzone */}
            <CompBox label="FileDropzone · react-dropzone" color={T.cyan} style={{padding:0,marginBottom:16}}>
              <Box style={{
                border:`2px dashed ${T.cyan}44`, borderRadius:8, padding:"32px 20px",
                textAlign:"center", background:T.cyanDim,
              }}>
                <div style={{fontSize:28,marginBottom:8}}>↑</div>
                <div style={{fontSize:13,fontWeight:700,color:T.white,marginBottom:4}}>CSV 또는 Excel 파일을 드래그하세요</div>
                <div style={{fontSize:10,color:T.muted,marginBottom:12}}>지원: .csv .xlsx .xls · 최대 200MB · EUC-KR / UTF-8 자동 감지</div>
                <Row gap={8} style={{justifyContent:"center"}}>
                  <Btn label="파일 선택" color={T.cyan}/>
                  <Btn label="샘플 데이터 받기" color={T.cyan} outline/>
                </Row>
              </Box>
            </CompBox>
            <ApiTag method="POST" path="/api/data/upload"/>

            {/* Quality summary */}
            <CompBox label="DataQualitySummary" color={T.amber} style={{padding:12,marginBottom:16}}>
              <Row gap={10}>
                {[
                  ["총 행", "3,200", T.white],
                  ["총 열", "6", T.white],
                  ["결측 컬럼", "1", T.amber],
                  ["중복 행", "0", T.green],
                  ["수치형", "2", T.cyan],
                  ["범주형", "3", T.amber],
                  ["날짜형", "1", T.violet],
                ].map(([k,v,c],i)=>(
                  <Box key={i} style={{flex:1,background:T.bgCard,borderRadius:5,padding:"8px 0",textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                    <div style={{fontSize:9,color:T.muted}}>{k}</div>
                  </Box>
                ))}
              </Row>
            </CompBox>

            {/* Column type table */}
            <CompBox label="ColumnTypeTable · chardet + pandas.dtypes" color={T.muted} style={{padding:0}}>
              <Box style={{padding:"8px 10px 4px",background:T.bgPanel,borderRadius:"4px 4px 0 0"}}>
                <Row>
                  {["컬럼명","감지 타입","결측값","고유값","무시"].map((h,i)=>(
                    <span key={i} style={{flex:i===0?2:1,fontSize:9,color:T.muted,fontFamily:T.mono,letterSpacing:"0.06em"}}>{h}</span>
                  ))}
                </Row>
              </Box>
              {cols.map((c,i)=>(
                <Box key={i} style={{padding:"7px 10px",borderTop:`1px solid ${T.border}`,background:i%2===0?T.bgCard:"transparent"}}>
                  <Row style={{alignItems:"center"}}>
                    <span style={{flex:2,fontSize:11,color:T.white}}>{c.name}</span>
                    <span style={{flex:1}}><Chip text={c.type} color={c.color}/></span>
                    <span style={{flex:1,fontSize:10,color:c.missing!=="0%"?T.amber:T.muted}}>{c.missing}</span>
                    <span style={{flex:1,fontSize:10,color:T.mid}}>{c.unique}</span>
                    <span style={{flex:1}}>
                      <div style={{width:14,height:14,border:`1px solid ${T.border}`,borderRadius:3}}/>
                    </span>
                  </Row>
                </Box>
              ))}
            </CompBox>
          </Box>
        </Col>

        {/* Right: preview */}
        <Col gap={0} style={{width:"42%", overflow:"auto"}}>
          <Box style={{padding:"12px 16px", borderBottom:`1px solid ${T.border}`, background:T.bgPanel}}>
            <Label text="DataPreviewTable · 상위 50행" color={T.white} style={{fontSize:11}}/>
            <div style={{fontSize:10,color:T.muted,marginTop:2}}>결측값: 🟡 하이라이트</div>
          </Box>
          <Box style={{padding:12, flex:1}}>
            <CompBox label="DataTable · @tanstack/react-table" color={T.muted} style={{padding:0}}>
              <Box style={{background:T.bgPanel,padding:"6px 8px",borderRadius:"4px 4px 0 0"}}>
                <Row>
                  {["온도","압력","공정구분","설비ID","불량여부"].map((h,i)=>(
                    <span key={i} style={{flex:1,fontSize:9,color:T.muted,fontFamily:T.mono}}>{h}</span>
                  ))}
                </Row>
              </Box>
              {[
                ["82.3","4.21","A","M-01","정상"],
                ["91.7","4.55","A","M-02","불량"],
                ["79.1","—","B","M-01","정상"],
                ["88.4","4.30","A","M-03","정상"],
                ["95.2","4.88","C","M-02","불량"],
                ["81.0","4.15","B","M-04","정상"],
              ].map((row,i)=>(
                <Box key={i} style={{padding:"5px 8px",borderTop:`1px solid ${T.border}`,background:i%2===0?T.bgCard:"transparent"}}>
                  <Row>
                    {row.map((v,j)=>(
                      <span key={j} style={{flex:1,fontSize:10,fontFamily:T.mono,color:v==="—"?T.amber:v==="불량"?T.red:T.white}}>{v}</span>
                    ))}
                  </Row>
                </Box>
              ))}
              <Box style={{padding:"6px 8px",borderTop:`1px solid ${T.border}`,textAlign:"center"}}>
                <span style={{fontSize:9,color:T.muted}}>... 3,194행 더</span>
              </Box>
            </CompBox>
          </Box>
          <Box style={{padding:12,borderTop:`1px solid ${T.border}`}}>
            <Btn label="다음: 실험 설정 →" color={T.cyan} full/>
          </Box>
        </Col>
      </Row>
    </Col>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 3 — 실험 설정 (setup())
// ═══════════════════════════════════════════════════════
function S_Setup({ goto }) {
  const [mod, setMod] = useState(0);
  const modules = ["분류","회귀","클러스터링","이상탐지","시계열"];
  const modColors = [T.cyan,T.amber,T.green,T.violet,T.green];

  return (
    <Row gap={0} style={{height:"100%"}}>
      {/* Left: form */}
      <Col gap={0} style={{flex:1, borderRight:`1px solid ${T.border}`, overflow:"auto"}}>
        <Box style={{padding:"16px 20px", borderBottom:`1px solid ${T.border}`}}>
          <Label text="PyCaret setup() 파라미터 구성" color={T.white} style={{fontSize:12}}/>
          <div style={{fontSize:10,color:T.muted,marginTop:2}}>모든 옵션은 setup() 호출 시 Python으로 변환됩니다</div>
          <ApiTag method="POST" path="/api/train/setup"/>
        </Box>

        <Col gap={16} style={{padding:20, flex:1}}>
          {/* Module tabs */}
          <CompBox label="ModuleSelector" color={T.cyan} style={{padding:10}}>
            <Label text="ML 모듈 선택" color={T.muted} style={{marginBottom:8}}/>
            <Row gap={6}>
              {modules.map((m,i)=>(
                <div key={i} onClick={()=>setMod(i)} style={{
                  flex:1,textAlign:"center",padding:"7px 4px",borderRadius:5,cursor:"pointer",
                  background:mod===i?`${modColors[i]}22`:T.bgCard,
                  border:`1px solid ${mod===i?modColors[i]:T.border}`,
                  fontSize:11,color:mod===i?modColors[i]:T.muted,fontWeight:mod===i?700:400,
                }}>{m}</div>
              ))}
            </Row>
          </CompBox>

          {/* Basic settings */}
          <CompBox label="BasicSettings" color={T.cyan} style={{padding:12}}>
            <Label text="기본 설정" color={T.cyan} style={{marginBottom:10}}/>
            <Col gap={10}>
              <Row gap={10}>
                <Box style={{flex:1}}><Field label="타겟 컬럼 (target)" type="select" value="불량여부" color={T.cyan}/></Box>
                <Box style={{flex:1}}><Field label="실험 이름 (experiment_name)" value="제조_불량예측_v1" color={T.cyan}/></Box>
              </Row>
              <Row gap={10}>
                <Box style={{flex:1}}><Slider label="학습 데이터 비율 (train_size)" val={80} color={T.cyan}/></Box>
                <Box style={{flex:1}}><Slider label="Cross-Validation Folds" val={10} max={20} color={T.cyan}/></Box>
              </Row>
              <Row gap={10}>
                <Box style={{flex:1}}><Field label="Session ID (재현성)" value="42"/></Box>
                <Box style={{flex:1}}><Field label="MLflow 실험 기록 (log_experiment)" type="toggle" value="ON" color={T.cyan}/></Box>
              </Row>
            </Col>
          </CompBox>

          {/* Preprocessing */}
          <CompBox label="PreprocessingOptions" color={T.amber} style={{padding:12}}>
            <Label text="전처리 옵션" color={T.amber} style={{marginBottom:10}}/>
            <Col gap={10}>
              <Row gap={10}>
                <Box style={{flex:1}}><Field label="결측값 처리 (imputation_type)" type="select" value="iterative (LightGBM)"/></Box>
                <Box style={{flex:1}}><Field label="정규화 (normalize_method)" type="select" value="zscore"/></Box>
              </Row>
              <Row gap={10}>
                <Box style={{flex:1}}><Field label="이상치 제거 (remove_outliers)" type="toggle" value="OFF" color={T.amber}/></Box>
                <Box style={{flex:1}}><Field label="클래스 불균형 (fix_imbalance → SMOTE)" type="toggle" value="ON" color={T.amber}/></Box>
              </Row>
              <Row gap={10}>
                <Box style={{flex:1}}><Field label="피처 선택 (feature_selection)" type="toggle" value="OFF"/></Box>
                <Box style={{flex:1}}><Field label="플롯 자동 저장 (log_plots)" type="toggle" value="ON" color={T.amber}/></Box>
              </Row>
            </Col>
          </CompBox>
        </Col>

        <Box style={{padding:14,borderTop:`1px solid ${T.border}`}}>
          <Row gap={8}>
            <Btn label="← 업로드" color={T.muted} outline/>
            <Box style={{flex:1}}/>
            <Btn label="setup() 실행 → 모델 비교" color={T.cyan}/>
          </Row>
        </Box>
      </Col>

      {/* Right: code preview */}
      <Col gap={0} style={{width:"38%"}}>
        <Box style={{padding:"12px 16px", borderBottom:`1px solid ${T.border}`, background:T.bgPanel}}>
          <Label text="코드 미리보기 (실시간)" color={T.green} style={{fontSize:11}}/>
          <div style={{fontSize:10,color:T.muted,marginTop:2}}>setup() 파라미터 → Python 코드 자동 생성</div>
        </Box>
        <CompBox label="CodePreviewPanel" color={T.green} style={{margin:14,padding:0,flex:1}}>
          <Box style={{
            background:"#050E1A",borderRadius:5,padding:16,
            fontFamily:T.mono,fontSize:10,lineHeight:2,
            color:"#7AA8D0",overflow:"auto",height:"100%",
          }}>
            <div><span style={{color:T.muted}}># PyCaret 3.0 — 자동 생성 코드</span></div>
            <div><span style={{color:T.violet}}>from</span> <span style={{color:T.cyan}}>pycaret.classification</span> <span style={{color:T.violet}}>import</span> *</div>
            <div/>
            <div><span style={{color:T.amber}}>s</span> = setup(</div>
            <div style={{paddingLeft:16}}>data=<span style={{color:T.green}}>df</span>,</div>
            <div style={{paddingLeft:16}}>target=<span style={{color:T.green}}>'불량여부'</span>,</div>
            <div style={{paddingLeft:16}}>train_size=<span style={{color:T.amber}}>0.8</span>,</div>
            <div style={{paddingLeft:16}}>fold=<span style={{color:T.amber}}>10</span>,</div>
            <div style={{paddingLeft:16}}>normalize=<span style={{color:T.amber}}>True</span>,</div>
            <div style={{paddingLeft:16}}>normalize_method=<span style={{color:T.green}}>'zscore'</span>,</div>
            <div style={{paddingLeft:16}}>fix_imbalance=<span style={{color:T.amber}}>True</span>,</div>
            <div style={{paddingLeft:16}}>imputation_type=<span style={{color:T.green}}>'iterative'</span>,</div>
            <div style={{paddingLeft:16}}>log_experiment=<span style={{color:T.amber}}>True</span>,</div>
            <div style={{paddingLeft:16}}>log_plots=<span style={{color:T.amber}}>True</span>,</div>
            <div style={{paddingLeft:16}}>experiment_name=<span style={{color:T.green}}>'제조_불량예측_v1'</span>,</div>
            <div style={{paddingLeft:16}}>session_id=<span style={{color:T.amber}}>42</span></div>
            <div>)</div>
            <div/>
            <div><span style={{color:T.muted}}># Pipeline: zscore → SMOTE → LightGBM imputer</span></div>
          </Box>
        </CompBox>

        <Box style={{margin:"0 14px 14px"}}>
          <CompBox label="SetupResultSummary" color={T.muted} style={{padding:12}}>
            <Label text="setup() 완료 후 표시" color={T.muted} style={{marginBottom:8}}/>
            {[
              ["변환 후 shape","3,200 × 11 (피처 5개 추가)"],
              ["파이프라인 단계","zscore → SMOTE → OneHotEncoder"],
              ["타겟 분포","정상 87.4% / 불량 12.6%"],
            ].map(([k,v],i)=>(
              <Row key={i} style={{justifyContent:"space-between",padding:"4px 0",borderBottom:i<2?`1px solid ${T.border}`:"none"}}>
                <span style={{fontSize:10,color:T.muted}}>{k}</span>
                <span style={{fontSize:10,color:T.white}}>{v}</span>
              </Row>
            ))}
          </CompBox>
        </Box>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 4 — 모델 비교 (compare_models)
// ═══════════════════════════════════════════════════════
function S_Compare({ goto }) {
  const rows = [
    { name:"LightGBM", acc:"0.9241", auc:"0.9813", f1:"0.8847", rec:"0.8632", prec:"0.9074", tt:"2.14", top:true },
    { name:"CatBoost", acc:"0.9187", auc:"0.9781", f1:"0.8762", rec:"0.8510", prec:"0.9030", tt:"8.42", top:false },
    { name:"XGBoost", acc:"0.9103", auc:"0.9723", f1:"0.8681", rec:"0.8420", prec:"0.8960", tt:"3.21", top:false },
    { name:"Random Forest", acc:"0.9034", auc:"0.9654", f1:"0.8530", rec:"0.8280", prec:"0.8798", tt:"4.88", top:false },
    { name:"Extra Trees", acc:"0.8912", auc:"0.9588", f1:"0.8421", rec:"0.8142", prec:"0.8718", tt:"5.11", top:false },
    { name:"GBM", acc:"0.8874", auc:"0.9512", f1:"0.8344", rec:"0.8091", prec:"0.8610", tt:"6.30", top:false },
  ];

  return (
    <Row gap={0} style={{height:"100%"}}>
      {/* Left options */}
      <Col gap={0} style={{width:220, borderRight:`1px solid ${T.border}`}}>
        <Box style={{padding:"12px 14px", borderBottom:`1px solid ${T.border}`, background:T.bgPanel}}>
          <Label text="compare_models() 옵션" color={T.amber} style={{fontSize:11}}/>
          <ApiTag method="POST" path="/api/train/compare"/>
        </Box>
        <Col gap={12} style={{padding:14, flex:1, overflow:"auto"}}>
          <Field label="정렬 기준 (sort)" type="select" value="Accuracy" color={T.amber}/>
          <Field label="시간 예산 (budget_time)" type="select" value="3분" color={T.amber}/>
          <Field label="상위 선택 수 (n_select)" type="select" value="3개" color={T.amber}/>
          <Field label="Cross-validation" type="toggle" value="ON" color={T.amber}/>
          <Label text="제외 알고리즘 (exclude)" color={T.muted}/>
          <CompBox label="ExcludeMultiSelect" color={T.muted} style={{padding:8}}>
            {["catboost","svm","knn"].map((m,i)=>(
              <Row key={i} gap={6} style={{padding:"4px 0"}}>
                <div style={{width:12,height:12,border:`1px solid ${T.border}`,borderRadius:2}}/>
                <span style={{fontSize:10,color:T.muted,fontFamily:T.mono}}>{m}</span>
              </Row>
            ))}
          </CompBox>
          <Btn label="▶ 비교 시작" color={T.amber} full/>
          <Box style={{background:T.bgCard,borderRadius:5,padding:"8px 10px"}}>
            <div style={{fontSize:9,color:T.muted,marginBottom:4}}>현재 진행</div>
            <Bar pct={75} color={T.amber} label="LightGBM 학습 중..." h={4}/>
            <div style={{fontSize:9,color:T.muted,marginTop:6}}>8 / 12 알고리즘 완료</div>
          </Box>
        </Col>
      </Col>

      {/* Center: leaderboard */}
      <Col gap={0} style={{flex:1, borderRight:`1px solid ${T.border}`, overflow:"hidden"}}>
        <Box style={{padding:"12px 16px", borderBottom:`1px solid ${T.border}`, background:T.bgPanel}}>
          <Row style={{justifyContent:"space-between",alignItems:"center"}}>
            <Label text="리더보드 — 실시간 업데이트 (SSE)" color={T.white} style={{fontSize:11}}/>
            <Row gap={8}>
              <Chip text="10-Fold CV" color={T.amber}/>
              <span style={{fontSize:9,color:T.green}}>● 업데이트 중</span>
            </Row>
          </Row>
        </Box>
        <Box style={{overflow:"auto",flex:1}}>
          <CompBox label="LeaderboardTable · SSE stream" color={T.amber} style={{margin:14,padding:0}}>
            <Box style={{background:T.bgPanel,padding:"7px 8px",borderRadius:"4px 4px 0 0"}}>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 1fr 1fr 0.8fr",gap:4}}>
                {["알고리즘","Accuracy","AUC","F1","Recall","Precision","TT(s)"].map((h,i)=>(
                  <span key={i} style={{fontSize:9,color:i===1?T.amber:T.muted,fontFamily:T.mono,letterSpacing:"0.05em",fontWeight:i===1?700:400}}>{h}</span>
                ))}
              </div>
            </Box>
            {rows.map((r,i)=>(
              <Box key={i} style={{
                background:r.top?`${T.amber}12`:i%2===0?T.bgCard:"transparent",
                padding:"7px 8px",borderTop:`1px solid ${T.border}`,
              }}>
                <div style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 1fr 1fr 0.8fr",gap:4,alignItems:"center"}}>
                  <Row gap={6}>
                    {r.top && <span style={{fontSize:9,background:T.amberDim,color:T.amber,padding:"1px 5px",borderRadius:3}}>★</span>}
                    <span style={{fontSize:11,color:r.top?T.amber:T.white,fontWeight:r.top?700:400}}>{r.name}</span>
                    <div style={{width:10,height:10,border:`1px solid ${T.muted}44`,borderRadius:2}}/>
                  </Row>
                  {[r.acc,r.auc,r.f1,r.rec,r.prec,r.tt].map((v,j)=>(
                    <span key={j} style={{fontSize:10,fontFamily:T.mono,color:j===0?r.top?T.amber:T.cyan:T.mid}}>{v}</span>
                  ))}
                </div>
              </Box>
            ))}
          </CompBox>
        </Box>
        <Box style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`}}>
          <Row gap={8}>
            <span style={{fontSize:10,color:T.muted}}>체크박스로 2~3개 선택 후 →</span>
            <Btn label="선택 모델 튜닝 →" color={T.amber}/>
          </Row>
        </Box>
      </Col>

      {/* Right: radar */}
      <Col gap={0} style={{width:200}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="비교 레이더 차트" color={T.white} style={{fontSize:11}}/>
        </Box>
        <CompBox label="RadarCompareChart · recharts" color={T.amber} style={{margin:14,padding:10,flex:1}}>
          <Box style={{height:160}}><Radar color={T.amber}/></Box>
          <Col gap={6} style={{marginTop:8}}>
            {[["LightGBM",T.amber],["CatBoost",T.cyan],["XGBoost",T.green]].map(([n,c],i)=>(
              <Row key={i} gap={6} style={{alignItems:"center"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
                <span style={{fontSize:10,color:T.mid}}>{n}</span>
              </Row>
            ))}
          </Col>
        </CompBox>
        <Box style={{padding:"0 14px 14px"}}>
          <CompBox label="MLflowRunLinks" color={T.muted} style={{padding:10}}>
            <Label text="MLflow Runs" color={T.muted} style={{marginBottom:6}}/>
            {["run_a2b3c4d","run_e5f6g7h","run_i8j9k0l"].map((r,i)=>(
              <div key={i} style={{fontSize:9,fontFamily:T.mono,color:T.cyan,padding:"2px 0"}}>{r}</div>
            ))}
          </CompBox>
        </Box>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 5 — 학습 & 튜닝
// ═══════════════════════════════════════════════════════
function S_Tune({ goto }) {
  return (
    <Row gap={0} style={{height:"100%"}}>
      {/* Left options */}
      <Col gap={0} style={{width:230, borderRight:`1px solid ${T.border}`}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="tune_model() 설정" color={T.amber} style={{fontSize:11}}/>
          <ApiTag method="POST" path="/api/train/tune"/>
        </Box>
        <Col gap={12} style={{padding:14,overflow:"auto",flex:1}}>
          <Label text="튜닝 대상 모델" color={T.muted}/>
          <CompBox label="ModelSelectFromCompare" color={T.amber} style={{padding:8}}>
            {[["LightGBM","★ 1위",true],["CatBoost","2위",false],["XGBoost","3위",false]].map(([n,r,sel],i)=>(
              <Row key={i} gap={8} style={{padding:"5px 0",borderBottom:i<2?`1px solid ${T.border}`:"none",alignItems:"center"}}>
                <div style={{width:14,height:14,borderRadius:3,background:sel?T.amber:T.bgCard,border:`1px solid ${sel?T.amber:T.border}`}}/>
                <span style={{fontSize:11,color:sel?T.amber:T.mid}}>{n}</span>
                <span style={{fontSize:9,color:T.muted,marginLeft:"auto"}}>{r}</span>
              </Row>
            ))}
          </CompBox>
          <Field label="최적화 지표 (optimize)" type="select" value="Accuracy" color={T.amber}/>
          <Field label="튜너 (search_library)" type="select" value="optuna" color={T.amber}/>
          <Slider label="반복 횟수 (n_iter)" val={100} color={T.amber}/>
          <Field label="early_stopping" type="toggle" value="ON" color={T.amber}/>
          <Field label="choose_better" type="toggle" value="ON" color={T.amber}/>
          <Divider/>
          <Label text="앙상블 옵션" color={T.muted}/>
          <Field label="Blend Models" type="toggle" value="OFF"/>
          <Field label="Stack Models" type="toggle" value="OFF"/>
          <Btn label="◎ 튜닝 시작" color={T.amber} full/>
        </Col>
      </Col>

      {/* Center: progress + result */}
      <Col gap={0} style={{flex:1, borderRight:`1px solid ${T.border}`, overflow:"auto"}}>
        <Box style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="Optuna 튜닝 진행 — 실시간 Trial 결과 (SSE)" color={T.white} style={{fontSize:11}}/>
        </Box>

        <Col gap={14} style={{padding:16}}>
          {/* Optuna scatter mock */}
          <CompBox label="OptunaTuningScatter · recharts ScatterChart" color={T.amber} style={{padding:12}}>
            <Box style={{height:140,background:T.bgCard,borderRadius:5,position:"relative",overflow:"hidden"}}>
              <svg width="100%" height="100%" style={{position:"absolute",inset:0}}>
                {/* Grid */}
                {[0.88,0.90,0.92,0.94].map((v,i)=>(
                  <g key={i}>
                    <line x1="40" y1={20+i*26} x2="95%" y2={20+i*26} stroke={T.border} strokeWidth="0.5"/>
                    <text x="32" y={24+i*26} fontSize="7" fill={T.muted} textAnchor="end">{v}</text>
                  </g>
                ))}
                {/* Scatter points */}
                {[[50,95],[80,82],[120,60],[160,48],[200,44],[240,40],[280,38],[310,36],[340,35],[360,34]].map(([x,y],i)=>(
                  <circle key={i} cx={40+x*0.82} cy={y*1.2} r={i===9?5:3}
                    fill={i===9?T.amber:T.amberDim} stroke={i===9?T.amber:"transparent"} strokeWidth="1.5"/>
                ))}
                <text x="220" y="130" fontSize="8" fill={T.muted}>Trial #</text>
              </svg>
            </Box>
            <Row style={{justifyContent:"center",marginTop:8,gap:16}}>
              <Row gap={5}><div style={{width:8,height:8,borderRadius:"50%",background:T.amber}}/><span style={{fontSize:9,color:T.muted}}>최적 Trial</span></Row>
              <Row gap={5}><div style={{width:8,height:8,borderRadius:"50%",background:T.amberDim,border:`1px solid ${T.amber}44`}}/><span style={{fontSize:9,color:T.muted}}>일반 Trial</span></Row>
            </Row>
          </CompBox>

          {/* Before/After */}
          <CompBox label="TuningBeforeAfter" color={T.green} style={{padding:12}}>
            <Label text="튜닝 결과 — Before / After" color={T.green} style={{marginBottom:10}}/>
            <Box style={{background:T.bgPanel,borderRadius:4,padding:"6px 8px",marginBottom:6}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:4}}>
                {["지표","Before","After","개선"].map((h,i)=>(
                  <span key={i} style={{fontSize:9,color:T.muted,fontFamily:T.mono}}>{h}</span>
                ))}
              </div>
            </Box>
            {[
              ["Accuracy","0.9241","0.9387","↑ +1.6%"],
              ["AUC","0.9813","0.9871","↑ +0.6%"],
              ["F1","0.8847","0.9012","↑ +1.9%"],
              ["Recall","0.8632","0.8821","↑ +2.2%"],
            ].map(([k,b,a,d],i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:4,padding:"5px 8px",borderTop:`1px solid ${T.border}`}}>
                <span style={{fontSize:11,color:T.white}}>{k}</span>
                <span style={{fontSize:10,fontFamily:T.mono,color:T.muted}}>{b}</span>
                <span style={{fontSize:10,fontFamily:T.mono,color:T.green,fontWeight:700}}>{a}</span>
                <span style={{fontSize:10,fontFamily:T.mono,color:T.green}}>{d}</span>
              </div>
            ))}
          </CompBox>

          <Row gap={8}>
            <Btn label="분석 화면으로 →" color={T.violet} outline/>
            <Btn label="이 모델로 확정 →" color={T.green}/>
          </Row>
        </Col>
      </Col>

      {/* Right: hyperparams */}
      <Col gap={0} style={{width:200}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="최적 하이퍼파라미터" color={T.white} style={{fontSize:11}}/>
        </Box>
        <CompBox label="HyperparamsDiff" color={T.amber} style={{margin:14,padding:10,flex:1}}>
          <Label text="변경된 파라미터만 표시" color={T.muted} style={{marginBottom:8}}/>
          {[
            ["num_leaves","31","127"],
            ["learning_rate","0.1","0.032"],
            ["max_depth","-1","8"],
            ["n_estimators","100","487"],
            ["min_data_leaf","20","14"],
          ].map(([k,def,opt],i)=>(
            <Box key={i} style={{padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:9,color:T.muted,fontFamily:T.mono,display:"block",marginBottom:2}}>{k}</span>
              <Row gap={6}>
                <span style={{fontSize:10,color:T.muted,fontFamily:T.mono,textDecoration:"line-through"}}>{def}</span>
                <span style={{fontSize:10,color:T.amber,fontFamily:T.mono,fontWeight:700}}>→ {opt}</span>
              </Row>
            </Box>
          ))}
        </CompBox>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 6 — 모델 분석
// ═══════════════════════════════════════════════════════
function S_Analyze({ goto }) {
  const [plotTab, setPlotTab] = useState(0);
  const plots = ["AUC-ROC","혼동행렬","Feature Imp.","SHAP Summary","잔차 분석","Calibration"];

  return (
    <Row gap={0} style={{height:"100%"}}>
      {/* Left: plot selector */}
      <Col gap={0} style={{width:190, borderRight:`1px solid ${T.border}`}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="plot_model() 선택" color={T.violet} style={{fontSize:11}}/>
          <ApiTag method="POST" path="/api/analyze/plot"/>
        </Box>
        <Col gap={4} style={{padding:10,overflow:"auto",flex:1}}>
          <Label text="분류 플롯" color={T.muted} style={{marginBottom:4}}/>
          {plots.map((p,i)=>(
            <div key={i} onClick={()=>setPlotTab(i)} style={{
              padding:"8px 10px",borderRadius:5,cursor:"pointer",
              background:plotTab===i?T.violetDim:T.bgCard,
              border:`1px solid ${plotTab===i?T.violet:T.border}`,
              fontSize:11,color:plotTab===i?T.violet:T.mid,
            }}>{p}</div>
          ))}
          <Divider style={{margin:"8px 0"}}/>
          <Label text="SHAP 해석" color={T.muted} style={{marginBottom:4}}/>
          {["SHAP Summary","Correlation","단건 이유분석","Dependence"].map((p,i)=>(
            <div key={i} style={{
              padding:"7px 10px",borderRadius:5,cursor:"pointer",
              background:T.bgCard,border:`1px solid ${T.border}`,
              fontSize:11,color:T.mid,
            }}>{p}</div>
          ))}
        </Col>
        <Box style={{padding:10,borderTop:`1px solid ${T.border}`}}>
          <Field label="데이터 기준" type="select" value="Test Data"/>
          <Box style={{marginTop:8}}><Btn label="PNG 저장" color={T.muted} small outline full/></Box>
        </Box>
      </Col>

      {/* Center: chart area */}
      <Col gap={0} style={{flex:1, borderRight:`1px solid ${T.border}`}}>
        <Box style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Row style={{justifyContent:"space-between",alignItems:"center"}}>
            <Label text={`${plots[plotTab]} — plot_model(tuned_lgbm, plot='${["auc","confusion_matrix","feature","summary","residuals","calibration"][plotTab]}')`} color={T.white} style={{fontSize:10}}/>
            <Row gap={6}>
              <Chip text="Train" color={T.muted}/>
              <Chip text="Test ✓" color={T.violet}/>
            </Row>
          </Row>
        </Box>
        <CompBox label="PlotRenderArea · matplotlib/plotly → base64 img" color={T.violet} style={{margin:16,padding:0,flex:1}}>
          <Box style={{
            height:"100%",background:T.bgCard,borderRadius:5,
            display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,
          }}>
            {plotTab===0 && (
              <svg viewBox="0 0 200 160" width="280" height="224">
                <rect x="30" y="10" width="160" height="130" fill="none" stroke={T.border} strokeWidth="0.5"/>
                <line x1="30" y1="140" x2="190" y2="10" stroke={T.muted} strokeWidth="0.5" strokeDasharray="3,3"/>
                <polyline fill="none" stroke={T.violet} strokeWidth="2"
                  points="30,140 50,125 75,95 100,72 130,48 160,30 190,14"/>
                <polygon fill={T.violetDim} stroke="none"
                  points="30,140 50,125 75,95 100,72 130,48 160,30 190,14 190,140"/>
                <text x="110" y="155" fontSize="8" fill={T.muted} textAnchor="middle">False Positive Rate</text>
                <text x="12" y="80" fontSize="8" fill={T.muted} textAnchor="middle" transform="rotate(-90,12,80)">True Positive Rate</text>
                <text x="140" y="90" fontSize="9" fill={T.violet}>AUC = 0.9871</text>
              </svg>
            )}
            {plotTab===1 && (
              <Col gap={4} style={{alignItems:"center"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                  {[["2,387\nTN",T.green,"80px"],["112\nFP",T.amber,"80px"],["89\nFN",T.amber,"80px"],["412\nTP",T.cyan,"80px"]].map(([v,c,w],i)=>(
                    <div key={i} style={{width:80,height:80,background:`${c}25`,border:`2px solid ${c}55`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
                      <span style={{fontSize:16,fontWeight:800,color:c,lineHeight:1.4}}>{v}</span>
                    </div>
                  ))}
                </div>
                <span style={{fontSize:9,color:T.muted}}>혼동행렬 (Confusion Matrix)</span>
              </Col>
            )}
            {plotTab===2 && (
              <Col gap={3} style={{width:"80%"}}>
                {[["온도(°C)",88],["압력(bar)",71],["설비ID",54],["공정구분",38],["진동(Hz)",29],["습도(%)",18]].map(([n,v],i)=>(
                  <Row key={i} gap={8} style={{alignItems:"center"}}>
                    <span style={{fontSize:10,color:T.mid,width:80,textAlign:"right"}}>{n}</span>
                    <div style={{flex:1,height:16,background:T.border,borderRadius:2}}>
                      <div style={{height:"100%",width:`${v}%`,background:`hsl(${210+i*20},80%,60%)`,borderRadius:2}}/>
                    </div>
                    <span style={{fontSize:9,fontFamily:T.mono,color:T.mid,width:24}}>{v}%</span>
                  </Row>
                ))}
                <span style={{fontSize:9,color:T.muted,textAlign:"center",marginTop:4}}>SHAP Feature Importance</span>
              </Col>
            )}
            {plotTab>2 && (
              <Col style={{alignItems:"center",gap:8}}>
                <div style={{width:60,height:60,borderRadius:"50%",border:`2px dashed ${T.violet}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:24,color:T.violet}}>◈</span>
                </div>
                <span style={{fontSize:11,color:T.muted}}>{plots[plotTab]} 플롯 영역</span>
                <span style={{fontSize:9,color:T.border}}>matplotlib 이미지 렌더링</span>
              </Col>
            )}
          </Box>
        </CompBox>
      </Col>

      {/* Right: interpret */}
      <Col gap={0} style={{width:220}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="interpret_model() — SHAP" color={T.white} style={{fontSize:11}}/>
          <ApiTag method="POST" path="/api/analyze/interpret"/>
        </Box>
        <CompBox label="ShapWaterfall · 단건 이유 분석" color={T.green} style={{margin:14,padding:12}}>
          <Label text="Row #42 예측 이유" color={T.green} style={{marginBottom:10}}/>
          <Col gap={3}>
            {[
              ["온도(°C)","↑ +0.342",T.red],
              ["압력(bar)","↑ +0.218",T.red],
              ["설비ID_M02","↑ +0.154",T.red],
              ["공정구분_A","↓ −0.089",T.cyan],
              ["습도(%)","↓ −0.041",T.cyan],
              ["기준값","0.124",T.muted],
            ].map(([k,v,c],i)=>(
              <Row key={i} style={{justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:9,color:T.mid}}>{k}</span>
                <span style={{fontSize:10,fontFamily:T.mono,color:c,fontWeight:700}}>{v}</span>
              </Row>
            ))}
          </Col>
          <Box style={{marginTop:10,padding:"8px",background:T.redDim,borderRadius:4,border:`1px solid ${T.red}44`}}>
            <span style={{fontSize:11,color:T.red,fontWeight:700}}>→ 불량 예측 (0.847)</span>
          </Box>
        </CompBox>
        <Box style={{margin:"0 14px",padding:10,background:T.bgCard,borderRadius:5,border:`1px solid ${T.border}`}}>
          <Label text="SHAP Index 선택" color={T.muted} style={{marginBottom:6}}/>
          <Field label="행 번호" value="42" color={T.green}/>
          <Box style={{marginTop:8}}><Btn label="분석 실행" color={T.green} small full/></Box>
        </Box>
        <Box style={{padding:"14px",borderTop:`1px solid ${T.border}`,marginTop:"auto"}}>
          <Row gap={8}>
            <Btn label="← 튜닝" color={T.muted} outline small/>
            <Btn label="모델 확정 →" color={T.green}/>
          </Row>
        </Box>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 7 — 모델 확정 & 저장
// ═══════════════════════════════════════════════════════
function S_Finalize({ goto }) {
  return (
    <Row gap={0} style={{height:"100%"}}>
      {/* Left */}
      <Col gap={0} style={{flex:1, borderRight:`1px solid ${T.border}`, overflow:"auto"}}>
        <Box style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
          <Label text="finalize_model() + save_model()" color={T.green} style={{fontSize:12}}/>
          <div style={{fontSize:10,color:T.muted,marginTop:2}}>전체 데이터(Train+Test)로 재학습 → 파이프라인 저장</div>
          <ApiTag method="POST" path="/api/train/finalize/{model_id}"/>
        </Box>

        <Col gap={16} style={{padding:20}}>
          {/* Model summary */}
          <CompBox label="SelectedModelCard" color={T.green} style={{padding:14}}>
            <Row style={{justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <Col gap={3}>
                <Row gap={8}>
                  <Chip text="분류" color={T.cyan}/>
                  <Chip text="LightGBM" color={T.green}/>
                  <Chip text="Tuned" color={T.amber}/>
                </Row>
                <span style={{fontSize:14,fontWeight:700,color:T.white}}>tuned_lgbm (tune_model 결과)</span>
              </Col>
              <Col style={{textAlign:"right"}}>
                <span style={{fontSize:24,fontWeight:800,color:T.green}}>93.87%</span>
                <span style={{fontSize:9,color:T.muted}}>Accuracy (CV)</span>
              </Col>
            </Row>
            <Row gap={10}>
              {[["Train Acc","94.2%",T.green],["Test Acc","93.1%",T.cyan],["AUC","0.9871",T.violet],["F1","0.9012",T.amber]].map(([k,v,c],i)=>(
                <Box key={i} style={{flex:1,background:T.bgCard,borderRadius:4,padding:"8px 0",textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:T.muted}}>{k}</div>
                </Box>
              ))}
            </Row>
          </CompBox>

          {/* Finalize */}
          <CompBox label="FinalizeButton · finalize_model()" color={T.green} style={{padding:14}}>
            <Label text="전체 데이터로 재학습 (3,200행 모두 사용)" color={T.muted} style={{marginBottom:10}}/>
            <Box style={{background:T.bgCard,borderRadius:5,padding:12,marginBottom:12,fontFamily:T.mono,fontSize:10,color:"#7AA8D0",lineHeight:1.8}}>
              <span style={{color:T.muted}}># finalize_model()은 test set 포함 전체 데이터로 재학습</span><br/>
              <span style={{color:T.amber}}>final_model</span> = finalize_model(<span style={{color:T.cyan}}>tuned_lgbm</span>)<br/>
              <span style={{color:T.amber}}>final_acc</span> <span style={{color:T.green}}>↑ 94.2%</span> <span style={{color:T.muted}}>(CV 93.87%에서 소폭 향상)</span>
            </Box>
            <Btn label="▶ 전체 데이터로 재학습 (finalize_model)" color={T.green} full/>
          </CompBox>

          {/* Save */}
          <CompBox label="SaveModelForm · save_model()" color={T.cyan} style={{padding:14}}>
            <Label text="모델 저장 설정" color={T.cyan} style={{marginBottom:10}}/>
            <Row gap={10}>
              <Box style={{flex:2}}><Field label="저장 파일명 (save_model)" value="불량예측_lgbm_v3" color={T.cyan}/></Box>
              <Box style={{flex:1}}><Field label="저장 경로" value="./models/" color={T.cyan}/></Box>
            </Row>
            <Box style={{marginTop:10,background:T.bgCard,borderRadius:4,padding:10,fontFamily:T.mono,fontSize:10,color:T.muted}}>
              저장 내용: <span style={{color:T.cyan}}>전처리 파이프라인 + 인코더 + 스케일러 + LightGBM 모델</span> (.pkl)
            </Box>
            <Box style={{marginTop:10}}><Btn label="💾 모델 저장 (save_model)" color={T.cyan} outline full/></Box>
          </CompBox>
        </Col>
      </Col>

      {/* Right: MLflow Registry */}
      <Col gap={0} style={{width:"40%"}}>
        <Box style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="MLflow Model Registry" color={T.white} style={{fontSize:12}}/>
          <div style={{fontSize:10,color:T.muted,marginTop:2}}>mlflow.register_model() → Production 승격</div>
          <ApiTag method="POST" path="/api/registry/register"/>
        </Box>

        <Col gap={14} style={{padding:16,overflow:"auto",flex:1}}>
          <CompBox label="RegisterForm" color={T.green} style={{padding:12}}>
            <Field label="MLflow 모델 이름" value="불량예측_모델" color={T.green}/>
            <Box style={{marginTop:10}}><Btn label="레지스트리에 등록 →" color={T.green} full/></Box>
          </CompBox>

          <CompBox label="StageManager" color={T.amber} style={{padding:12}}>
            <Label text="스테이지 관리" color={T.amber} style={{marginBottom:10}}/>
            <Row gap={6} style={{marginBottom:12}}>
              {["None","Staging","Production","Archived"].map((s,i)=>(
                <div key={i} style={{
                  flex:1,textAlign:"center",padding:"6px 0",borderRadius:4,
                  background:i===2?T.greenDim:T.bgCard,
                  border:`1px solid ${i===2?T.green:T.border}`,
                  fontSize:9,color:i===2?T.green:T.muted,
                  cursor:"pointer",
                }}>{s}</div>
              ))}
            </Row>
            <Row style={{justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10,color:T.muted}}>기존 Production 자동 Archive</span>
              <div style={{width:28,height:15,borderRadius:8,background:T.green,position:"relative"}}>
                <div style={{width:11,height:11,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:14}}/>
              </div>
            </Row>
          </CompBox>

          <CompBox label="VersionTimeline · recharts Timeline" color={T.muted} style={{padding:12}}>
            <Label text="버전 히스토리" color={T.muted} style={{marginBottom:10}}/>
            {[
              { v:"v3", stage:"Production", acc:"94.2%", date:"2026-03-09", current:true },
              { v:"v2", stage:"Archived",   acc:"91.8%", date:"2026-02-20", current:false },
              { v:"v1", stage:"Archived",   acc:"89.3%", date:"2026-01-15", current:false },
            ].map((r,i)=>(
              <Row key={i} style={{
                padding:"10px 12px",marginBottom:6,borderRadius:5,
                background:r.current?T.greenDim:T.bgCard,
                border:`1px solid ${r.current?T.green:T.border}`,
                alignItems:"center",
              }}>
                <Col gap={2} style={{flex:1}}>
                  <Row gap={8}>
                    <span style={{fontSize:12,fontWeight:700,color:r.current?T.green:T.mid}}>{r.v}</span>
                    <span style={{fontSize:9,color:r.current?T.green:T.muted,background:`${r.current?T.green:T.muted}22`,padding:"1px 6px",borderRadius:8}}>{r.stage}</span>
                  </Row>
                  <span style={{fontSize:9,color:T.muted}}>Accuracy {r.acc} · {r.date}</span>
                </Col>
                {!r.current && <Btn label="롤백" color={T.muted} small outline/>}
                {r.current && <span style={{fontSize:9,color:T.green,fontWeight:700}}>● LIVE</span>}
              </Row>
            ))}
          </CompBox>

          <CompBox label="PipelineSummary" color={T.muted} style={{padding:10}}>
            <Label text="저장된 파이프라인 구성" color={T.muted} style={{marginBottom:8}}/>
            {["① zscore 정규화","② SMOTE 오버샘플링","③ OneHotEncoder (공정구분)","④ LightGBM (final_model)"].map((s,i)=>(
              <div key={i} style={{fontSize:10,color:T.mid,padding:"4px 0",borderBottom:i<3?`1px solid ${T.border}`:"none"}}>
                {s}
              </div>
            ))}
          </CompBox>

          <Row gap={8} style={{marginTop:4}}>
            <Btn label="PDF 리포트" color={T.muted} outline full small/>
            <Btn label="예측 화면으로 →" color={T.green} full/>
          </Row>
        </Col>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 8 — 예측 실행
// ═══════════════════════════════════════════════════════
function S_Predict({ goto }) {
  const [tab, setTab] = useState(0);
  return (
    <Row gap={0} style={{height:"100%"}}>
      {/* Left: model selector + settings */}
      <Col gap={0} style={{width:220, borderRight:`1px solid ${T.border}`}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="predict_model() 설정" color={T.green} style={{fontSize:11}}/>
          <ApiTag method="POST" path="/api/predict/{model_name}"/>
        </Box>
        <Col gap={12} style={{padding:14,overflow:"auto",flex:1}}>
          <Field label="사용 모델 (model_name)" type="select" value="불량예측_모델 v3" color={T.green}/>
          <CompBox label="ModelMetaCard" color={T.muted} style={{padding:10}}>
            {[["알고리즘","LightGBM"],["스테이지","● Production"],["정확도","94.2%"],["학습일","2026-03-09"],["학습 행 수","3,200행"]].map(([k,v],i)=>(
              <Row key={i} style={{justifyContent:"space-between",padding:"4px 0",borderBottom:i<4?`1px solid ${T.border}`:"none"}}>
                <span style={{fontSize:9,color:T.muted}}>{k}</span>
                <span style={{fontSize:9,color:T.white}}>{v}</span>
              </Row>
            ))}
          </CompBox>
          <Slider label="확률 임계값 (probability_threshold)" val={50} color={T.green}/>
          <div style={{fontSize:9,color:T.muted}}>50% 이상 → 불량으로 판정</div>
        </Col>
      </Col>

      {/* Center: predict form / batch */}
      <Col gap={0} style={{flex:1, borderRight:`1px solid ${T.border}`, overflow:"hidden"}}>
        <Row gap={0} style={{borderBottom:`1px solid ${T.border}`}}>
          {["단건 예측","배치 예측 (CSV)","예측 이력"].map((t,i)=>(
            <div key={i} onClick={()=>setTab(i)} style={{
              padding:"10px 18px",fontSize:11,cursor:"pointer",
              color:tab===i?T.green:T.muted,
              borderBottom:`2px solid ${tab===i?T.green:"transparent"}`,
            }}>{t}</div>
          ))}
        </Row>

        <Col gap={0} style={{flex:1, overflow:"auto"}}>
          {tab===0 && (
            <Col gap={14} style={{padding:18}}>
              <CompBox label="SinglePredictForm · 피처 입력 폼" color={T.green} style={{padding:14}}>
                <Label text="입력값 (학습 피처에 맞게 자동 생성)" color={T.green} style={{marginBottom:10}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Field label="온도(°C) [범위: 70~100]" value="88.5" color={T.green}/>
                  <Field label="압력(bar) [범위: 3.8~5.2]" value="4.62" color={T.green}/>
                  <Field label="공정구분" type="select" value="A" color={T.green}/>
                  <Field label="설비ID" type="select" value="M-02" color={T.green}/>
                  <Field label="진동(Hz)" value="12.3" color={T.green}/>
                  <Field label="습도(%)" value="65.4" color={T.green}/>
                </div>
                <Box style={{marginTop:12}}><Btn label="▶ 예측 실행" color={T.green} full/></Box>
              </CompBox>
              <CompBox label="PredictResultCard" color={T.red} style={{padding:14}}>
                <Row style={{justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <Col gap={4}>
                    <Label text="예측 결과" color={T.muted}/>
                    <span style={{fontSize:26,fontWeight:800,color:T.red}}>불량</span>
                  </Col>
                  <Col gap={4} style={{alignItems:"flex-end"}}>
                    <Label text="불량 확률" color={T.muted}/>
                    <span style={{fontSize:26,fontWeight:800,color:T.red}}>84.7%</span>
                  </Col>
                </Row>
                <Bar pct={84.7} color={T.red} h={10}/>
                <div style={{marginTop:6,fontSize:10,color:T.muted}}>predict_model() → Label: 불량 / Score: 0.847</div>
              </CompBox>
            </Col>
          )}
          {tab===1 && (
            <Col gap={14} style={{padding:18}}>
              <CompBox label="BatchUploadDropzone" color={T.green} style={{padding:0}}>
                <Box style={{border:`2px dashed ${T.green}44`,borderRadius:8,padding:"24px 20px",textAlign:"center",background:T.greenDim}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.white,marginBottom:4}}>예측할 CSV 파일 업로드</div>
                  <div style={{fontSize:10,color:T.muted,marginBottom:12}}>컬럼 매핑 자동 확인 · 파이프라인 전처리 자동 적용</div>
                  <Btn label="파일 선택" color={T.green}/>
                </Box>
              </CompBox>
              <CompBox label="BatchResultTable · Label + Score 컬럼 추가" color={T.muted} style={{padding:0}}>
                <Box style={{background:T.bgPanel,padding:"6px 8px",borderRadius:"4px 4px 0 0"}}>
                  <div style={{display:"grid",gridTemplateColumns:"0.5fr 1fr 1fr 1fr 1fr 1fr",gap:4}}>
                    {["#","온도","압력","공정구분","예측결과","불량확률"].map((h,i)=>(
                      <span key={i} style={{fontSize:9,color:i>3?T.green:T.muted,fontFamily:T.mono,fontWeight:i>3?700:400}}>{h}</span>
                    ))}
                  </div>
                </Box>
                {[[1,"88.5","4.62","A","불량","84.7%"],[2,"79.1","4.21","B","정상","12.3%"],[3,"95.2","4.88","A","불량","91.2%"],[4,"81.0","4.15","B","정상","8.7%"]].map((r,i)=>(
                  <Box key={i} style={{padding:"5px 8px",borderTop:`1px solid ${T.border}`,background:r[4]==="불량"?T.redDim:T.bgCard}}>
                    <div style={{display:"grid",gridTemplateColumns:"0.5fr 1fr 1fr 1fr 1fr 1fr",gap:4}}>
                      {r.map((v,j)=>(
                        <span key={j} style={{fontSize:10,fontFamily:T.mono,color:j===4?v==="불량"?T.red:T.green:j===5?v==="불량"||parseFloat(v)>50?T.red:T.green:T.mid}}>{v}</span>
                      ))}
                    </div>
                  </Box>
                ))}
              </CompBox>
              <Row gap={8}>
                <Btn label="고위험만 보기 (≥50%)" color={T.red} small outline/>
                <Btn label="결과 CSV 다운로드" color={T.green} small/>
              </Row>
            </Col>
          )}
          {tab===2 && (
            <Col gap={14} style={{padding:18}}>
              <CompBox label="PredictionHistory · SQLite predictions 테이블" color={T.muted} style={{padding:0}}>
                <Box style={{background:T.bgPanel,padding:"6px 8px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr",gap:4}}>
                    {["시각","모델","소스","예측값","확률"].map((h,i)=>(
                      <span key={i} style={{fontSize:9,color:T.muted,fontFamily:T.mono}}>{h}</span>
                    ))}
                  </div>
                </Box>
                {[
                  ["03-09 14:32","불량예측 v3","수동","불량","84.7%"],
                  ["03-09 14:18","불량예측 v3","배치","정상","12.3%"],
                  ["03-09 13:55","수율예측 v1","자동","95.2%","—"],
                  ["03-09 13:40","설비고장 v2","실시간","이상","97.1%"],
                ].map((r,i)=>(
                  <Box key={i} style={{padding:"5px 8px",borderTop:`1px solid ${T.border}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr",gap:4}}>
                      {r.map((v,j)=>(
                        <span key={j} style={{fontSize:10,fontFamily:T.mono,color:j===3&&v==="불량"?T.red:j===3&&v==="이상"?T.red:T.mid}}>{v}</span>
                      ))}
                    </div>
                  </Box>
                ))}
              </CompBox>
            </Col>
          )}
        </Col>
      </Col>

      {/* Right: SHAP */}
      <Col gap={0} style={{width:210}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="예측 이유 (SHAP Waterfall)" color={T.white} style={{fontSize:11}}/>
        </Box>
        <CompBox label="ShapReasonPanel · interpret_model(reason)" color={T.red} style={{margin:14,padding:12,flex:1}}>
          <Label text="이 예측이 불량인 이유" color={T.red} style={{marginBottom:10}}/>
          {[
            ["온도 88.5°C","↑ +0.312",T.red,"높은 온도"],
            ["설비 M-02","↑ +0.198",T.red,"고장 이력"],
            ["압력 4.62","↑ +0.145",T.red,"기준 초과"],
            ["공정구분 A","↓ −0.067",T.cyan,"영향 적음"],
            ["습도 65%","↓ −0.031",T.cyan,"정상 범위"],
          ].map(([k,v,c,d],i)=>(
            <Box key={i} style={{padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
              <Row style={{justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:T.mid}}>{k}</span>
                <span style={{fontSize:10,fontFamily:T.mono,color:c,fontWeight:700}}>{v}</span>
              </Row>
              <span style={{fontSize:8,color:T.muted}}>{d}</span>
            </Box>
          ))}
          <Box style={{marginTop:10,padding:8,background:T.redDim,borderRadius:4,border:`1px solid ${T.red}44`,textAlign:"center"}}>
            <span style={{fontSize:12,fontWeight:800,color:T.red}}>불량 확률 84.7%</span>
          </Box>
        </CompBox>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 9 — MLflow 관리
// ═══════════════════════════════════════════════════════
function S_MLflow({ goto }) {
  const [tab, setTab] = useState(0);
  return (
    <Row gap={0} style={{height:"100%"}}>
      {/* Left nav */}
      <Col gap={0} style={{width:180, borderRight:`1px solid ${T.border}`}}>
        <Box style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
          <Label text="MLflow 통합 관리" color={T.mid} style={{fontSize:11}}/>
          <div style={{fontSize:9,color:T.muted,marginTop:2}}>localhost:5000</div>
        </Box>
        <Col gap={4} style={{padding:10}}>
          {["실험 로그","실험 비교","모델 레지스트리","자동 스케줄"].map((t,i)=>(
            <div key={i} onClick={()=>setTab(i)} style={{
              padding:"8px 10px",borderRadius:5,cursor:"pointer",
              background:tab===i?`${T.mid}22`:T.bgCard,
              border:`1px solid ${tab===i?T.mid:T.border}`,
              fontSize:11,color:tab===i?T.white:T.muted,
            }}>{t}</div>
          ))}
          <Divider style={{margin:"8px 0"}}/>
          <Box style={{padding:10,background:T.bgCard,borderRadius:5}}>
            <Label text="서버 상태" color={T.muted} style={{marginBottom:6}}/>
            <Row gap={6} style={{marginBottom:4}}><div style={{width:6,height:6,borderRadius:"50%",background:T.green}}/><span style={{fontSize:10,color:T.green}}>연결됨</span></Row>
            <div style={{fontSize:9,color:T.muted}}>mlflow==2.11.0</div>
            <div style={{fontSize:9,color:T.muted}}>runs: 142</div>
            <Box style={{marginTop:8}}><Btn label="MLflow UI 열기 ↗" color={T.mid} small outline full/></Box>
          </Box>
        </Col>
      </Col>

      {/* Main area */}
      <Col gap={0} style={{flex:1, overflow:"hidden"}}>
        {tab===0 && (
          <Col gap={0} style={{flex:1,overflow:"hidden"}}>
            <Box style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
              <Row style={{justifyContent:"space-between",alignItems:"center"}}>
                <Label text="실험 로그 — setup(log_experiment=True) 자동 기록" color={T.white} style={{fontSize:11}}/>
                <Row gap={8}>
                  <Field label="" type="select" value="제조_불량예측_v1"/>
                  <Btn label="필터" color={T.muted} small outline/>
                </Row>
              </Row>
              <ApiTag method="GET" path="/api/experiments"/>
            </Box>
            <Box style={{overflow:"auto",flex:1,padding:14}}>
              <CompBox label="ExperimentLogTable · mlflow.search_runs()" color={T.mid} style={{padding:0}}>
                <Box style={{background:T.bgPanel,padding:"7px 10px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 1fr 1fr 1fr 1fr",gap:4}}>
                    {["Run ID","모델","Accuracy","AUC","F1","학습시간","날짜"].map((h,i)=>(
                      <span key={i} style={{fontSize:9,color:T.muted,fontFamily:T.mono}}>{h}</span>
                    ))}
                  </div>
                </Box>
                {[
                  ["run_a2b3c","tuned_lgbm","0.9387","0.9871","0.9012","12.4s","03-09"],
                  ["run_d4e5f","lgbm","0.9241","0.9813","0.8847","3.2s","03-09"],
                  ["run_g6h7i","catboost","0.9187","0.9781","0.8762","8.4s","03-09"],
                  ["run_j8k9l","xgboost","0.9103","0.9723","0.8681","5.1s","03-09"],
                  ["run_m0n1o","rf","0.9034","0.9654","0.8530","6.8s","03-08"],
                ].map((r,i)=>(
                  <Box key={i} style={{padding:"6px 10px",borderTop:`1px solid ${T.border}`,background:i===0?`${T.amber}0A`:i%2===0?T.bgCard:"transparent"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 1fr 1fr 1fr 1fr",gap:4,alignItems:"center"}}>
                      {r.map((v,j)=>(
                        <span key={j} style={{fontSize:10,fontFamily:T.mono,color:i===0&&j===0?T.amber:j===2?T.cyan:T.mid}}>{v}</span>
                      ))}
                    </div>
                  </Box>
                ))}
              </CompBox>
            </Box>
          </Col>
        )}

        {tab===1 && (
          <Col gap={14} style={{padding:16,overflow:"auto",flex:1}}>
            <Row gap={14}>
              <CompBox label="RadarCompare · 지표 비교" color={T.mid} style={{flex:1,padding:12}}>
                <Label text="run_a vs run_d — 지표 레이더" color={T.mid} style={{marginBottom:8}}/>
                <Box style={{height:160}}><Radar color={T.cyan}/></Box>
              </CompBox>
              <CompBox label="ParamDiff · 파라미터 변경 내역" color={T.mid} style={{flex:1,padding:12}}>
                <Label text="파라미터 차이" color={T.mid} style={{marginBottom:8}}/>
                {[["num_leaves","31","127"],["learning_rate","0.1","0.032"],["n_estimators","100","487"]].map(([k,a,b],i)=>(
                  <Row key={i} style={{justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`}}>
                    <span style={{fontSize:10,fontFamily:T.mono,color:T.mid}}>{k}</span>
                    <Row gap={8}>
                      <span style={{fontSize:10,fontFamily:T.mono,color:T.muted,textDecoration:"line-through"}}>{a}</span>
                      <span style={{fontSize:10,fontFamily:T.mono,color:T.amber,fontWeight:700}}>{b}</span>
                    </Row>
                  </Row>
                ))}
              </CompBox>
            </Row>
          </Col>
        )}

        {tab===2 && (
          <Col gap={0} style={{flex:1,overflow:"hidden"}}>
            <Box style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.bgPanel}}>
              <Label text="모델 레지스트리 · mlflow.register_model()" color={T.white} style={{fontSize:11}}/>
              <ApiTag method="PUT" path="/api/registry/{name}/stage"/>
            </Box>
            <Col gap={12} style={{padding:16,overflow:"auto",flex:1}}>
              {[
                { name:"불량예측_모델", algo:"LightGBM", ver:3, stage:"Production", acc:"94.2%", color:T.cyan },
                { name:"수율예측_모델", algo:"CatBoost", ver:1, stage:"Production", acc:"0.873", color:T.amber },
                { name:"설비고장_모델", algo:"IsolationForest", ver:2, stage:"Production", acc:"—", color:T.violet },
              ].map((m,i)=>(
                <CompBox key={i} label={`RegisteredModel #${i+1}`} color={m.color} style={{padding:12}}>
                  <Row style={{justifyContent:"space-between",alignItems:"center"}}>
                    <Col gap={4}>
                      <Row gap={8}>
                        <span style={{fontSize:13,fontWeight:700,color:T.white}}>{m.name}</span>
                        <Chip text={`v${m.ver}`} color={m.color}/>
                        <Chip text={m.stage} color={T.green}/>
                      </Row>
                      <span style={{fontSize:10,color:T.muted}}>{m.algo} · {m.acc}</span>
                    </Col>
                    <Row gap={8}>
                      <Btn label="버전 히스토리" color={T.muted} small outline/>
                      <Btn label="Staging으로" color={m.color} small outline/>
                    </Row>
                  </Row>
                </CompBox>
              ))}
            </Col>
          </Col>
        )}

        {tab===3 && (
          <Col gap={14} style={{padding:16,overflow:"auto",flex:1}}>
            <CompBox label="APScheduler 설정" color={T.mid} style={{padding:14}}>
              <Label text="자동 실행 스케줄" color={T.mid} style={{marginBottom:10}}/>
              {[
                { job:"주간 드리프트 체크", schedule:"매주 월 09:00", status:"활성", next:"03-16 09:00" },
                { job:"일간 이메일 리포트", schedule:"매일 08:00", status:"활성", next:"03-10 08:00" },
                { job:"자동 재학습 (드리프트>40%)", schedule:"이벤트 트리거", status:"대기", next:"—" },
              ].map((s,i)=>(
                <Row key={i} style={{justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<2?`1px solid ${T.border}`:"none"}}>
                  <Col gap={3}>
                    <span style={{fontSize:11,color:T.white}}>{s.job}</span>
                    <span style={{fontSize:9,color:T.muted}}>{s.schedule} · 다음 실행: {s.next}</span>
                  </Col>
                  <Row gap={8}>
                    <span style={{fontSize:9,color:s.status==="활성"?T.green:T.amber,background:s.status==="활성"?T.greenDim:T.amberDim,padding:"2px 8px",borderRadius:8,border:`1px solid ${s.status==="활성"?T.green:T.amber}44`}}>{s.status}</span>
                    <Btn label="편집" color={T.muted} small outline/>
                  </Row>
                </Row>
              ))}
            </CompBox>
          </Col>
        )}
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════
function Sidebar({ active, setActive }) {
  const groups = [
    { label:"운영", screens:["home"] },
    { label:"데이터", screens:["upload","setup"] },
    { label:"학습", screens:["compare","tune"] },
    { label:"평가·배포", screens:["analyze","finalize","predict"] },
    { label:"MLOps", screens:["mlflow"] },
  ];

  return (
    <Col gap={0} style={{
      width:196, background:T.bgPanel, borderRight:`1px solid ${T.border}`,
      flexShrink:0,
    }}>
      {/* Logo */}
      <Box style={{padding:"16px 14px 14px", borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:13,fontWeight:800,color:T.cyan,letterSpacing:"0.04em",fontFamily:T.mono}}>⬡ MFG AI STUDIO</div>
        <div style={{fontSize:9,color:T.muted,marginTop:3,letterSpacing:"0.08em"}}>PyCaret 3.0 · MLflow 2.11</div>
      </Box>

      {/* Nav */}
      <Col gap={0} style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {groups.map((g,gi)=>(
          <Box key={gi}>
            <div style={{fontSize:8,color:T.muted,padding:"10px 14px 4px",letterSpacing:"0.14em",fontFamily:T.mono,fontWeight:700}}>{g.label}</div>
            {g.screens.map(id=>{
              const s = SCREENS.find(x=>x.id===id);
              const isActive = active===id;
              return (
                <Box key={id} onClick={()=>setActive(id)} style={{
                  padding:"9px 14px",cursor:"pointer",
                  background:isActive?`${s.color}18`:"transparent",
                  borderLeft:`3px solid ${isActive?s.color:"transparent"}`,
                  display:"flex",alignItems:"center",gap:10,
                }}>
                  <Box style={{
                    width:22,height:22,borderRadius:4,
                    background:isActive?s.color:`${s.color}22`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,color:isActive?T.bg:s.color,fontWeight:700,flexShrink:0,
                  }}>{s.icon}</Box>
                  <span style={{fontSize:11,color:isActive?s.color:T.muted,fontWeight:isActive?700:400}}>{s.label}</span>
                </Box>
              );
            })}
          </Box>
        ))}
      </Col>

      {/* Bottom */}
      <Box style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`}}>
        <Row gap={6} style={{marginBottom:4}}><div style={{width:6,height:6,borderRadius:"50%",background:T.green}}/><span style={{fontSize:9,color:T.green}}>MLflow 연결됨</span></Row>
        <Row gap={6}><div style={{width:6,height:6,borderRadius:"50%",background:T.muted}}/><span style={{fontSize:9,color:T.muted}}>4개 모델 운영 중</span></Row>
      </Box>
    </Col>
  );
}

// ═══════════════════════════════════════════════════════
//  HEADER
// ═══════════════════════════════════════════════════════
function Header({ screen, prev, next, setActive }) {
  return (
    <Box style={{
      background:T.bgPanel, borderBottom:`1px solid ${T.border}`,
      padding:"10px 20px", flexShrink:0,
    }}>
      <Row style={{justifyContent:"space-between",alignItems:"center"}}>
        <Row gap={10} style={{alignItems:"center"}}>
          <Box style={{
            width:28,height:28,borderRadius:5,
            background:`${screen.color}22`,border:`1px solid ${screen.color}55`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:13,color:screen.color,
          }}>{screen.icon}</Box>
          <Col gap={1}>
            <Row gap={8} style={{alignItems:"center"}}>
              <span style={{fontSize:8,fontFamily:T.mono,color:screen.color,letterSpacing:"0.12em",fontWeight:700}}>{screen.phase}</span>
              <span style={{fontSize:15,fontWeight:800,color:T.white}}>{screen.label}</span>
            </Row>
            <span style={{fontSize:9,color:T.muted}}>
              {{
                home:"다중 운영 모델 모니터링 및 빠른 예측 실행",
                upload:"CSV/Excel 업로드 → 자동 타입 감지 → 품질 분석",
                setup:"setup() — 전처리 파이프라인 + MLflow 실험 설정",
                compare:"compare_models() — 전체 알고리즘 성능 리더보드",
                tune:"tune_model() + ensemble — Optuna 하이퍼파라미터 최적화",
                analyze:"plot_model() + interpret_model() — SHAP 기반 모델 해석",
                finalize:"finalize_model() + save_model() + MLflow Registry 등록",
                predict:"predict_model() — 단건/배치/실시간 예측 실행",
                mlflow:"MLflow Tracking + Model Registry + APScheduler 관리",
              }[screen.id]}
            </span>
          </Col>
        </Row>

        {/* Step dots + nav */}
        <Row gap={10} style={{alignItems:"center"}}>
          <Row gap={3}>
            {SCREENS.map(s=>(
              <div key={s.id} style={{
                width:screen.id===s.id?20:6,height:6,borderRadius:3,
                background:screen.id===s.id?s.color:`${s.color}44`,
                transition:"width .2s",cursor:"pointer",
              }} onClick={()=>setActive(s.id)}/>
            ))}
          </Row>
          <Row gap={6}>
            {prev && <Btn label="← 이전" color={T.muted} small outline onClick={()=>setActive(prev)}/>}
            {next && <Btn label="다음 →" color={screen.color} small onClick={()=>setActive(next)}/>}
          </Row>
        </Row>
      </Row>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════
export default function App() {
  const [active, setActive] = useState("home");
  const idx = SCREENS.findIndex(s=>s.id===active);
  const screen = SCREENS[idx];
  const prev = idx>0 ? SCREENS[idx-1].id : null;
  const next = idx<SCREENS.length-1 ? SCREENS[idx+1].id : null;

  const SCREEN_MAP = {
    home:     S_Home,
    upload:   S_Upload,
    setup:    S_Setup,
    compare:  S_Compare,
    tune:     S_Tune,
    analyze:  S_Analyze,
    finalize: S_Finalize,
    predict:  S_Predict,
    mlflow:   S_MLflow,
  };
  const Screen = SCREEN_MAP[active];

  return (
    <Box style={{
      height:"100vh",display:"flex",flexDirection:"column",
      background:T.bg,color:T.white,
      fontFamily:T.font,overflow:"hidden",
      fontSize:13,
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>

      <Row gap={0} style={{flex:1,overflow:"hidden"}}>
        <Sidebar active={active} setActive={setActive}/>
        <Col gap={0} style={{flex:1,overflow:"hidden"}}>
          <Header screen={screen} prev={prev} next={next} setActive={setActive}/>
          <Box style={{flex:1,overflow:"hidden"}}>
            <Screen goto={setActive}/>
          </Box>
        </Col>
      </Row>
    </Box>
  );
}
