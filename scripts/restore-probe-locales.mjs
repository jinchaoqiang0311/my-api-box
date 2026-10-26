/**
 * One-shot: restore proper Chinese translations in all 8 siteProbing locale
 * files, covering every key found by i18next-cli extract (including the
 * summaries added by the static switch in i18n.ts).
 */
import { readFileSync, writeFileSync } from "node:fs"

const LANGS = ["zh-CN", "en", "de", "es-419", "pt-BR", "ja", "vi", "zh-TW"]

const STRINGS = {
  "zh-CN": {
    title: "站点检测",
    description:
      "七种标准化检测,验证中转站是否如实提供你付费的模型。每次运行消耗少量 token,报告可在本地导出。",
    labels: {
      account: "选择账号",
      accountPlaceholder: "请选择账号",
      apiKey: "API 密钥",
      apiKeyHint: "sk- 开头的密钥,用于对话与流式检测",
      model: "模型",
      modelPlaceholder: "先加载模型列表",
      loadModels: "加载模型",
      modelLoading: "加载中…",
      run: "开始检测",
      exportJson: "复制报告 JSON",
      accessToken: "系统访问令牌(可选)",
      accessTokenHint: "个人设置页生成的系统访问令牌,计费检测需要",
      userId: "用户 ID(可选)",
      userIdHint: "New-Api-User 请求头所需的数字用户 ID",
      billingNote:
        "计费检测通过站点 /api/user/self 读取余额前后差值,需要访问令牌与用户 ID。",
    },
    probes: {
      title: "检测项",
      reach: { label: "可达性", hint: "站点是否可达、响应延迟" },
      identity: {
        label: "身份指纹",
        hint: "自报模型与请求模型家族交叉核对,抓模型偷换",
      },
      injection: {
        label: "注入检测",
        hint: "检测站点是否注入系统提示或降智改造",
      },
      cache: { label: "缓存命中", hint: "随机码回显两次,抓缓存回放" },
      stream: { label: "流式质量", hint: "首字延迟与分块数,抓伪流式" },
      billing: { label: "计费验真", hint: "实际扣费与理论扣费对账" },
      consistency: { label: "一致性", hint: "与历史基线比对,抓静默换模" },
    },
    verdicts: {
      pass: "通过",
      fail: "异常",
      suspect: "可疑",
      unknown: "未知",
      skip: "跳过",
    },
    summaries: {
      probeError: "请求失败:{{error}}",
      reachOk: "{{ms}} ms",
      reachFail: "HTTP {{status}}",
      reachError: "连接失败:{{error}}",
      identityMatch: "自报:{{claimed}}",
      identityMismatch: "请求 {{requested}} 但自报 {{claimed}}",
      identityVague: "模型未按要求自报",
      injectionClean: "未发现注入指令",
      injectionSuspect: "模型披露了未下发的前置指令",
      cacheFresh: "两次均为新鲜生成",
      cacheHit: "第二次回放了第一次的答案",
      cacheVague: "模型未配合回显,无法判定",
      cacheOdd: "回显异常",
      streamOk: "首字 {{ttft}} ms / {{chunks}} 块",
      streamFake: "疑似伪流式:首字 {{ttft}} ms 后单块吐出",
      streamNoMetric: "未取到流式指标",
      billingSkip: "缺少访问令牌,已跳过",
      billingNoUsage: "响应缺少用量数据(扣费 {{deducted}})",
      billingOk: "扣费 {{deducted}} ≈ 理论 {{expected}}",
      billingOver: "扣费 {{deducted}} 远超理论 {{expected}}",
      consistencyFirst: "首次运行,已记录基线",
      consistencyStable: "与基线一致",
      consistencyDrift: "与基线漂移({{field}}),疑似静默换模",
    },
    status: {
      noAccounts: "暂无账号,请先在账号管理中添加。",
      needKey: "请先选择账号、填写密钥并加载模型。",
      running: "检测中…",
      copied: "报告已复制到剪贴板",
      summary: "{{pass}}/{{total}} 通过",
      modelsError: "模型加载失败:{{error}}",
    },
    results: { title: "检测结果" },
  },
}

const EN = {
  title: "Site Probing",
  description:
    "Seven standardized checks that verify a relay site serves the model you pay for. Each run costs a few tokens; reports stay local.",
  labels: {
    account: "Account",
    accountPlaceholder: "Select an account",
    apiKey: "API key",
    apiKeyHint: "sk- style key used by chat and streaming probes",
    model: "Model",
    modelPlaceholder: "Load the model list first",
    loadModels: "Load models",
    modelLoading: "Loading…",
    run: "Run probes",
    exportJson: "Copy report JSON",
    accessToken: "System access token (optional)",
    accessTokenHint:
      "Access token from the site's personal-settings page; required by the billing probe",
    userId: "User ID (optional)",
    userIdHint: "Numeric user id for the New-Api-User header",
    billingNote:
      "The billing probe reads quota before/after one billed request via /api/user/self; it needs the access token and user id.",
  },
  probes: {
    title: "Probes",
    reach: {
      label: "Reachability",
      hint: "Is the site up and how fast it answers",
    },
    identity: {
      label: "Identity",
      hint: "Cross-checks the self-reported model family to catch substitution",
    },
    injection: {
      label: "Injection",
      hint: "Detects injected system prompts or downgrading",
    },
    cache: {
      label: "Cache replay",
      hint: "Two random-code echoes to catch cached answers",
    },
    stream: {
      label: "Streaming",
      hint: "Time-to-first-token and chunk count to catch fake streaming",
    },
    billing: {
      label: "Billing",
      hint: "Reconciles the actual deduction against the expected cost",
    },
    consistency: {
      label: "Consistency",
      hint: "Compares against a stored baseline to catch silent swaps",
    },
  },
  verdicts: {
    pass: "Pass",
    fail: "Fail",
    suspect: "Suspect",
    unknown: "Unknown",
    skip: "Skip",
  },
  summaries: {
    probeError: "Request failed: {{error}}",
    reachOk: "{{ms}} ms",
    reachFail: "HTTP {{status}}",
    reachError: "Connection failed: {{error}}",
    identityMatch: "Self-reported: {{claimed}}",
    identityMismatch: "Requested {{requested}} but self-reported {{claimed}}",
    identityVague: "Model did not self-report",
    injectionClean: "No injected instructions found",
    injectionSuspect: "Model disclosed instructions we never sent",
    cacheFresh: "Both responses fresh",
    cacheHit: "Second call replayed the first answer",
    cacheVague: "Model did not echo; inconclusive",
    cacheOdd: "Echo anomaly",
    streamOk: "TTFT {{ttft}} ms / {{chunks}} chunks",
    streamFake: "Possible fake streaming: single chunk after {{ttft}} ms",
    streamNoMetric: "No streaming metrics captured",
    billingSkip: "No access token provided; skipped",
    billingNoUsage: "Response lacks usage data (deducted {{deducted}})",
    billingOk: "Deducted {{deducted}} ≈ expected {{expected}}",
    billingOver: "Deducted {{deducted}} far above expected {{expected}}",
    consistencyFirst: "First run; baseline recorded",
    consistencyStable: "Matches the baseline",
    consistencyDrift: "Drifted from baseline ({{field}}); possible silent swap",
  },
  status: {
    noAccounts: "No accounts yet. Add one in Account Management first.",
    needKey: "Select an account, enter the API key, then load models.",
    running: "Running…",
    copied: "Report copied to clipboard",
    summary: "{{pass}}/{{total}} passed",
    modelsError: "Failed to load models: {{error}}",
  },
  results: { title: "Results" },
}

const ZH = STRINGS["zh-CN"]

// zh-TW: convert to traditional Chinese
const ZH_TW = JSON.parse(JSON.stringify(ZH))
{
  const zhTw = STRINGS["zh-CN"]
  const o = ZH_TW
  o.title = "站點檢測"
  o.description =
    "七種標準化檢測,驗證中轉站是否如實提供你付費的模型。每次運行消耗少量 token,報告可在本地匯出。"
  o.labels = {
    ...zhTw.labels,
    account: "選擇帳號",
    accountPlaceholder: "請選擇帳號",
    apiKey: "API 金鑰",
    apiKeyHint: "sk- 開頭的金鑰,用於對話與串流檢測",
    modelPlaceholder: "先載入模型列表",
    loadModels: "載入模型",
    modelLoading: "載入中…",
    run: "開始檢測",
    exportJson: "複製報告 JSON",
    accessToken: "系統存取權杖(可選)",
    accessTokenHint: "個人設定頁產生的系統存取權杖,計費檢測需要",
    userId: "使用者 ID(可選)",
    userIdHint: "New-Api-User 請求頭所需的數字使用者 ID",
    billingNote:
      "計費檢測透過站點 /api/user/self 讀取餘額前後差值,需要存取權杖與使用者 ID。",
  }
  o.probes = {
    title: "檢測項",
    reach: { label: "可達性", hint: "站點是否可達、回應延遲" },
    identity: {
      label: "身分指紋",
      hint: "自報模型與請求模型家族交叉核對,抓模型偷換",
    },
    injection: {
      label: "注入檢測",
      hint: "檢測站點是否注入系統提示或降智改造",
    },
    cache: { label: "快取命中", hint: "隨機碼回顯兩次,抓快取回放" },
    stream: { label: "串流品質", hint: "首字延遲與分塊數,抓偽串流" },
    billing: { label: "計費驗真", hint: "實際扣費與理論扣費對帳" },
    consistency: { label: "一致性", hint: "與歷史基線比對,抓靜默換模" },
  }
  o.verdicts = {
    pass: "通過",
    fail: "異常",
    suspect: "可疑",
    unknown: "未知",
    skip: "跳過",
  }
  o.summaries = {
    ...zhTw.summaries,
    reachOk: "{{ms}} ms",
    reachFail: "HTTP {{status}}",
    reachError: "連線失敗:{{error}}",
    identityMatch: "自報:{{claimed}}",
    identityMismatch: "請求 {{requested}} 但自報 {{claimed}}",
    identityVague: "模型未按要求自報",
    injectionClean: "未發現注入指令",
    injectionSuspect: "模型披露了未下發的前置指令",
    cacheFresh: "兩次均為新鮮生成",
    cacheHit: "第二次回放了第一次的答案",
    cacheVague: "模型未配合回顯,無法判定",
    cacheOdd: "回顯異常",
    streamOk: "首字 {{ttft}} ms / {{chunks}} 塊",
    streamFake: "疑似偽串流:首字 {{ttft}} ms 後單塊吐出",
    streamNoMetric: "未取到串流指標",
    billingSkip: "缺少存取權杖,已跳過",
    billingNoUsage: "回應缺少用量資料(扣費 {{deducted}})",
    billingOk: "扣費 {{deducted}} ≈ 理論 {{expected}}",
    billingOver: "扣費 {{deducted}} 遠超理論 {{expected}}",
    consistencyFirst: "首次執行,已記錄基線",
    consistencyStable: "與基線一致",
    consistencyDrift: "與基線漂移({{field}}),疑似靜默換模",
  }
  o.status = {
    ...zhTw.status,
    noAccounts: "暫無帳號,請先在帳號管理中新增。",
    needKey: "請先選擇帳號、填寫金鑰並載入模型。",
    running: "檢測中…",
    copied: "報告已複製到剪貼簿",
    summary: "{{pass}}/{{total}} 通過",
    modelsError: "模型載入失敗:{{error}}",
  }
  o.results = { title: "檢測結果" }
}

const JA = {
  title: "サイト検査",
  description:
    "リレーサイトが支払ったモデルを実際に提供しているかを検証する 7 種類の標準チェック。各実行はわずかなトークンを消費し、レポートはローカルに保持されます。",
  labels: {
    account: "アカウント",
    accountPlaceholder: "アカウントを選択",
    apiKey: "API キー",
    apiKeyHint: "チャットとストリーミング検査で使用する sk- 形式のキー",
    model: "モデル",
    modelPlaceholder: "先にモデル一覧を読み込んでください",
    loadModels: "モデル取得",
    modelLoading: "読み込み中…",
    run: "検査を実行",
    exportJson: "レポート JSON をコピー",
    accessToken: "システムアクセストークン(任意)",
    accessTokenHint:
      "サイトの個人設定ページで生成されたトークン。課金検査に必要",
    userId: "ユーザー ID(任意)",
    userIdHint: "New-Api-User ヘッダー用の数値ユーザー ID",
    billingNote:
      "課金検査は /api/user/self で前後の残高差を読み取ります。アクセストークンとユーザー ID が必要です。",
  },
  probes: {
    title: "検査項目",
    reach: { label: "到達性", hint: "サイトが応答するかと遅延" },
    identity: {
      label: "識別",
      hint: "自己申告モデルと要求モデルのファミリー照合で入れ替えを検出",
    },
    injection: {
      label: "注入",
      hint: "システムプロンプト注入や劣化改変を検出",
    },
    cache: {
      label: "キャッシュ",
      hint: "ランダムコードの反復でキャッシュ再生を検出",
    },
    stream: {
      label: "ストリーミング",
      hint: "初頭遅延とチャンク数で偽ストリーミングを検出",
    },
    billing: { label: "課金", hint: "実際の引き去りと理論コストの照合" },
    consistency: {
      label: "一貫性",
      hint: "保存済みベースラインと比較し無断入れ替えを検出",
    },
  },
  verdicts: {
    pass: "合格",
    fail: "異常",
    suspect: "疑わしい",
    unknown: "不明",
    skip: "スキップ",
  },
  summaries: {
    probeError: "リクエスト失敗:{{error}}",
    reachOk: "{{ms}} ms",
    reachFail: "HTTP {{status}}",
    reachError: "接続失敗:{{error}}",
    identityMatch: "自己申告:{{claimed}}",
    identityMismatch: "要求 {{requested}} に対し自己申告は {{claimed}}",
    identityVague: "モデルが自己申告しなかった",
    injectionClean: "注入された指示は見つかりませんでした",
    injectionSuspect: "送っていない指示をモデルが開示",
    cacheFresh: "両方とも新鮮な生成",
    cacheHit: "2 回目が 1 回目の答えを再生",
    cacheVague: "モデルが反復せず判定不能",
    cacheOdd: "反復の異常",
    streamOk: "初頭 {{ttft}} ms / {{chunks}} チャンク",
    streamFake: "偽ストリーミングの疑い:{{ttft}} ms 後に単一チャンク",
    streamNoMetric: "ストリーミング指標を取得できず",
    billingSkip: "アクセストークンがないためスキップ",
    billingNoUsage: "応答に使用量データなし(引き去り {{deducted}})",
    billingOk: "引き去り {{deducted}} ≈ 理論 {{expected}}",
    billingOver: "引き去り {{deducted}} が理論 {{expected}} を大幅超過",
    consistencyFirst: "初回実行。ベースラインを記録",
    consistencyStable: "ベースラインと一致",
    consistencyDrift: "ベースラインから逸脱({{field}})。無断入れ替えの疑い",
  },
  status: {
    noAccounts:
      "アカウントがありません。先にアカウント管理で追加してください。",
    needKey: "アカウントを選択し、API キーを入力してモデルを取得してください。",
    running: "実行中…",
    copied: "レポートをクリップボードにコピーしました",
    summary: "{{pass}}/{{total}} 合格",
    modelsError: "モデル取得に失敗:{{error}}",
  },
  results: { title: "結果" },
}

const DE = {
  title: "Site-Prüfung",
  description:
    "Sieben standardisierte Checks, die verifizieren, ob eine Relay-Site das gebuchte Modell tatsächlich liefert. Jeder Lauf kostet wenige Tokens; Berichte bleiben lokal.",
  labels: {
    account: "Konto",
    accountPlaceholder: "Konto auswählen",
    apiKey: "API-Schlüssel",
    apiKeyHint: "sk- Schlüssel für Chat- und Streaming-Prüfungen",
    model: "Modell",
    modelPlaceholder: "Zuerst Modellliste laden",
    loadModels: "Modelle laden",
    modelLoading: "Lädt…",
    run: "Prüfungen starten",
    exportJson: "Bericht-JSON kopieren",
    accessToken: "System-Zugriffstoken (optional)",
    accessTokenHint:
      "Token aus den persönlichen Einstellungen der Site; für die Abrechnungsprüfung nötig",
    userId: "Benutzer-ID (optional)",
    userIdHint: "Numerische Benutzer-ID für den New-Api-User-Header",
    billingNote:
      "Die Abrechnungsprüfung liest das Guthaben vor/nach einer abgerechneten Anfrage über /api/user/self; Zugangstoken und Benutzer-ID sind erforderlich.",
  },
  probes: {
    title: "Prüfungen",
    reach: {
      label: "Erreichbarkeit",
      hint: "Ist die Site erreichbar und wie schnell sie antwortet",
    },
    identity: {
      label: "Identität",
      hint: "Gleicht die selbstgemeldete Modellfamilie ab, um Austausch zu erkennen",
    },
    injection: {
      label: "Injection",
      hint: "Erkennt injizierte System-Prompts oder Downgrading",
    },
    cache: {
      label: "Cache-Replay",
      hint: "Zwei Zufallscode-Echos erkennen zwischengespeicherte Antworten",
    },
    stream: {
      label: "Streaming",
      hint: "Time-to-first-token und Chunk-Anzahl erkennen Fake-Streaming",
    },
    billing: {
      label: "Abrechnung",
      hint: "Gleicht die tatsächliche Abbuchung mit den erwarteten Kosten ab",
    },
    consistency: {
      label: "Konsistenz",
      hint: "Vergleicht mit einer gespeicherten Baseline, um stille Austausche zu erkennen",
    },
  },
  verdicts: {
    pass: "Bestanden",
    fail: "Fehler",
    suspect: "Verdächtig",
    unknown: "Unbekannt",
    skip: "Übersprungen",
  },
  summaries: {
    probeError: "Anfrage fehlgeschlagen: {{error}}",
    reachOk: "{{ms}} ms",
    reachFail: "HTTP {{status}}",
    reachError: "Verbindung fehlgeschlagen: {{error}}",
    identityMatch: "Selbstgemeldet: {{claimed}}",
    identityMismatch: "Angefordert {{requested}}, selbstgemeldet {{claimed}}",
    identityVague: "Modell hat sich nicht gemeldet",
    injectionClean: "Keine injizierten Anweisungen gefunden",
    injectionSuspect: "Modell offenbarte nie gesendete Anweisungen",
    cacheFresh: "Beide Antworten frisch",
    cacheHit: "Zweiter Aufruf wiederholte die erste Antwort",
    cacheVague: "Modell hat nicht wiederholt; unbestimmt",
    cacheOdd: "Echo-Anomalie",
    streamOk: "TTFT {{ttft}} ms / {{chunks}} Chunks",
    streamFake:
      "Möglicherweise Fake-Streaming: einzelner Chunk nach {{ttft}} ms",
    streamNoMetric: "Keine Streaming-Metriken erfasst",
    billingSkip: "Kein Zugriffstoken; übersprungen",
    billingNoUsage: "Antwort ohne Nutzungdaten (abgebucht {{deducted}})",
    billingOk: "Abgebucht {{deducted}} ≈ erwartet {{expected}}",
    billingOver: "Abgebucht {{deducted}} weit über erwartet {{expected}}",
    consistencyFirst: "Erster Lauf; Baseline gespeichert",
    consistencyStable: "Stimmt mit der Baseline überein",
    consistencyDrift:
      "Weicht von der Baseline ab ({{field}}); möglicher stiller Austausch",
  },
  status: {
    noAccounts:
      "Noch keine Konten. Bitte zuerst in der Kontoverwaltung hinzufügen.",
    needKey: "Konto auswählen, API-Schlüssel eingeben, dann Modelle laden.",
    running: "Läuft…",
    copied: "Bericht in die Zwischenablage kopiert",
    summary: "{{pass}}/{{total}} bestanden",
    modelsError: "Modelle konnten nicht geladen werden: {{error}}",
  },
  results: { title: "Ergebnisse" },
}

const ES = {
  title: "Inspección del sitio",
  description:
    "Siete comprobaciones estandarizadas que verifican si un sitio de retransmisión sirve el modelo que pagas. Cada ejecución cuesta pocos tokens; los informes se quedan en local.",
  labels: {
    account: "Cuenta",
    accountPlaceholder: "Selecciona una cuenta",
    apiKey: "Clave API",
    apiKeyHint: "Clave tipo sk- para las pruebas de chat y streaming",
    model: "Modelo",
    modelPlaceholder: "Carga primero la lista de modelos",
    loadModels: "Cargar modelos",
    modelLoading: "Cargando…",
    run: "Ejecutar pruebas",
    exportJson: "Copiar JSON del informe",
    accessToken: "Token de acceso del sistema (opcional)",
    accessTokenHint:
      "Token de la página de ajustes personales del sitio; lo necesita la prueba de facturación",
    userId: "ID de usuario (opcional)",
    userIdHint: "ID numérico para la cabecera New-Api-User",
    billingNote:
      "La prueba de facturación lee la cuota antes/después de una solicitud facturada vía /api/user/self; necesita token de acceso e ID de usuario.",
  },
  probes: {
    title: "Pruebas",
    reach: {
      label: "Accesibilidad",
      hint: "Si el sitio responde y con qué latencia",
    },
    identity: {
      label: "Identidad",
      hint: "Cruza la familia del modelo autoinformado para detectar sustitución",
    },
    injection: {
      label: "Inyección",
      hint: "Detecta prompts de sistema inyectados o degradación",
    },
    cache: {
      label: "Repetición de caché",
      hint: "Dos ecos de código aleatorio detectan respuestas cacheadas",
    },
    stream: {
      label: "Streaming",
      hint: "Latencia al primer token y número de fragmentos detectan streaming falso",
    },
    billing: {
      label: "Facturación",
      hint: "Concilia el cargo real con el coste esperado",
    },
    consistency: {
      label: "Consistencia",
      hint: "Compara con una línea base guardada para detectar cambios silenciosos",
    },
  },
  verdicts: {
    pass: "Correcto",
    fail: "Fallo",
    suspect: "Sospechoso",
    unknown: "Desconocido",
    skip: "Omitido",
  },
  summaries: {
    probeError: "Solicitud fallida: {{error}}",
    reachOk: "{{ms}} ms",
    reachFail: "HTTP {{status}}",
    reachError: "Conexión fallida: {{error}}",
    identityMatch: "Autoinformado: {{claimed}}",
    identityMismatch: "Solicitado {{requested}} pero autoinformado {{claimed}}",
    identityVague: "El modelo no se autoinformó",
    injectionClean: "No se encontraron instrucciones inyectadas",
    injectionSuspect: "El modelo reveló instrucciones que nunca enviamos",
    cacheFresh: "Ambas respuestas frescas",
    cacheHit: "La segunda llamada repitió la primera respuesta",
    cacheVague: "El modelo no repitió; inconcluso",
    cacheOdd: "Anomalía en el eco",
    streamOk: "TTFT {{ttft}} ms / {{chunks}} fragmentos",
    streamFake: "Posible streaming falso: un solo fragmento tras {{ttft}} ms",
    streamNoMetric: "Sin métricas de streaming",
    billingSkip: "Sin token de acceso; omitido",
    billingNoUsage: "Respuesta sin datos de uso (descontado {{deducted}})",
    billingOk: "Descontado {{deducted}} ≈ esperado {{expected}}",
    billingOver: "Descontado {{deducted}} muy por encima de {{expected}}",
    consistencyFirst: "Primera ejecución; línea base guardada",
    consistencyStable: "Coincide con la línea base",
    consistencyDrift:
      "Se desvía de la línea base ({{field}}); posible cambio silencioso",
  },
  status: {
    noAccounts: "Aún no hay cuentas. Añade una primero en Gestión de cuentas.",
    needKey:
      "Selecciona una cuenta, introduce la clave API y carga los modelos.",
    running: "Ejecutando…",
    copied: "Informe copiado al portapapeles",
    summary: "{{pass}}/{{total}} correctas",
    modelsError: "Error al cargar modelos: {{error}}",
  },
  results: { title: "Resultados" },
}

const PT = {
  title: "Inspeção do site",
  description:
    "Sete verificações padronizadas que confirmam se um site de relay entrega o modelo pelo qual você pagou. Cada execução custa poucos tokens; os relatórios ficam locais.",
  labels: {
    account: "Conta",
    accountPlaceholder: "Selecione uma conta",
    apiKey: "Chave de API",
    apiKeyHint: "Chave sk- usada pelas sondas de chat e streaming",
    model: "Modelo",
    modelPlaceholder: "Carregue a lista de modelos primeiro",
    loadModels: "Carregar modelos",
    modelLoading: "Carregando…",
    run: "Executar sondas",
    exportJson: "Copiar JSON do relatório",
    accessToken: "Token de acesso do sistema (opcional)",
    accessTokenHint:
      "Token da página de configurações pessoais do site; exigido pela sonda de cobrança",
    userId: "ID do usuário (opcional)",
    userIdHint: "ID numérico para o cabeçalho New-Api-User",
    billingNote:
      "A sonda de cobrança lê a cota antes/depois de uma requisição cobrada via /api/user/self; exige token de acesso e ID do usuário.",
  },
  probes: {
    title: "Sondas",
    reach: {
      label: "Acessibilidade",
      hint: "Se o site responde e com qual latência",
    },
    identity: {
      label: "Identidade",
      hint: "Cruza a família do modelo autodeclarado para pegar substituição",
    },
    injection: {
      label: "Injeção",
      hint: "Detecta prompts de sistema injetados ou rebaixamento",
    },
    cache: {
      label: "Replay de cache",
      hint: "Dois ecos de código aleatório pegam respostas em cache",
    },
    stream: {
      label: "Streaming",
      hint: "Latência do primeiro token e número de blocos pegam streaming falso",
    },
    billing: {
      label: "Cobrança",
      hint: "Concilia o débito real com o custo esperado",
    },
    consistency: {
      label: "Consistência",
      hint: "Compara com uma baseline salva para pegar trocas silenciosas",
    },
  },
  verdicts: {
    pass: "Aprovado",
    fail: "Falha",
    suspect: "Suspeito",
    unknown: "Desconhecido",
    skip: "Ignorado",
  },
  summaries: {
    probeError: "Requisição falhou: {{error}}",
    reachOk: "{{ms}} ms",
    reachFail: "HTTP {{status}}",
    reachError: "Conexão falhou: {{error}}",
    identityMatch: "Autodeclarado: {{claimed}}",
    identityMismatch: "Solicitado {{requested}} mas autodeclarado {{claimed}}",
    identityVague: "O modelo não se autodeclarou",
    injectionClean: "Nenhuma instrução injetada encontrada",
    injectionSuspect: "O modelo revelou instruções que nunca enviamos",
    cacheFresh: "Ambas as respostas frescas",
    cacheHit: "A segunda chamada repetiu a primeira resposta",
    cacheVague: "O modelo não repetiu; inconclusivo",
    cacheOdd: "Anomalia no eco",
    streamOk: "TTFT {{ttft}} ms / {{chunks}} blocos",
    streamFake: "Possível streaming falso: um único bloco após {{ttft}} ms",
    streamNoMetric: "Sem métricas de streaming",
    billingSkip: "Sem token de acesso; ignorado",
    billingNoUsage: "Resposta sem dados de uso (debitado {{deducted}})",
    billingOk: "Debitado {{deducted}} ≈ esperado {{expected}}",
    billingOver: "Debitado {{deducted}} bem acima do esperado {{expected}}",
    consistencyFirst: "Primeira execução; baseline registrada",
    consistencyStable: "Condiz com a baseline",
    consistencyDrift:
      "Divergiu da baseline ({{field}}); possível troca silenciosa",
  },
  status: {
    noAccounts:
      "Ainda não há contas. Adicione uma primeiro no Gerenciamento de contas.",
    needKey:
      "Selecione uma conta, informe a chave de API e carregue os modelos.",
    running: "Executando…",
    copied: "Relatório copiado para a área de transferência",
    summary: "{{pass}}/{{total}} aprovadas",
    modelsError: "Falha ao carregar modelos: {{error}}",
  },
  results: { title: "Resultados" },
}

const VI = {
  title: "Kiểm tra trang",
  description:
    "Bảy bước kiểm tra chuẩn hóa xác minh trang chuyển tiếp có thực sự cung cấp mẫu bạn đã trả tiền. Mỗi lần chạy tốn ít token; báo cáo giữ trên máy.",
  labels: {
    account: "Tài khoản",
    accountPlaceholder: "Chọn tài khoản",
    apiKey: "Khóa API",
    apiKeyHint: "Khóa dạng sk- dùng cho các kiểm tra chat và streaming",
    model: "Mô hình",
    modelPlaceholder: "Tải danh sách mô hình trước",
    loadModels: "Tải mô hình",
    modelLoading: "Đang tải…",
    run: "Chạy kiểm tra",
    exportJson: "Sao chép JSON báo cáo",
    accessToken: "Token truy cập hệ thống (không bắt buộc)",
    accessTokenHint:
      "Token từ trang cài đặt cá nhân của trang; cần cho kiểm tra thanh toán",
    userId: "ID người dùng (không bắt buộc)",
    userIdHint: "ID số cho header New-Api-User",
    billingNote:
      "Kiểm tra thanh toán đọc hạn mức trước/sau một yêu cầu tính phí qua /api/user/self; cần token truy cập và ID người dùng.",
  },
  probes: {
    title: "Các kiểm tra",
    reach: {
      label: "Khả năng tiếp cận",
      hint: "Trang có phản hồi và độ trễ bao nhiêu",
    },
    identity: {
      label: "Danh tính",
      hint: "Đối chiếu họ mô hình tự báo để phát hiện tráo đổi",
    },
    injection: {
      label: "Tiêm lệnh",
      hint: "Phát hiện system prompt bị tiêm hoặc hạ cấp",
    },
    cache: {
      label: "Phát lại bộ nhớ đệm",
      hint: "Hai lần lặp mã ngẫu nhiên phát hiện câu trả lời cached",
    },
    stream: {
      label: "Streaming",
      hint: "Độ trễ token đầu và số khối phát hiện streaming giả",
    },
    billing: {
      label: "Thanh toán",
      hint: "Đối chiếu số tiền trừ thực tế với chi phí lý thuyết",
    },
    consistency: {
      label: "Nhất quán",
      hint: "So với baseline đã lưu để phát hiện tráo đổi ngầm",
    },
  },
  verdicts: {
    pass: "Đạt",
    fail: "Lỗi",
    suspect: "Nghi vấn",
    unknown: "Không rõ",
    skip: "Bỏ qua",
  },
  summaries: {
    probeError: "Yêu cầu thất bại: {{error}}",
    reachOk: "{{ms}} ms",
    reachFail: "HTTP {{status}}",
    reachError: "Kết nối thất bại: {{error}}",
    identityMatch: "Tự báo: {{claimed}}",
    identityMismatch: "Yêu cầu {{requested}} nhưng tự báo {{claimed}}",
    identityVague: "Mô hình không tự báo",
    injectionClean: "Không tìm thấy lệnh bị tiêm",
    injectionSuspect: "Mô hình tiết lộ lệnh ta chưa từng gửi",
    cacheFresh: "Cả hai phản hồi đều mới",
    cacheHit: "Lần hai phát lại câu trả lời lần một",
    cacheVague: "Mô hình không lặp lại; không kết luận được",
    cacheOdd: "Lặp lại bất thường",
    streamOk: "TTFT {{ttft}} ms / {{chunks}} khối",
    streamFake: "Nghi streaming giả: một khối duy nhất sau {{ttft}} ms",
    streamNoMetric: "Không thu được chỉ số streaming",
    billingSkip: "Thiếu token truy cập; bỏ qua",
    billingNoUsage: "Phản hồi thiếu dữ liệu sử dụng (đã trừ {{deducted}})",
    billingOk: "Đã trừ {{deducted}} ≈ lý thuyết {{expected}}",
    billingOver: "Đã trừ {{deducted}} vượt xa lý thuyết {{expected}}",
    consistencyFirst: "Chạy lần đầu; đã ghi baseline",
    consistencyStable: "Khớp baseline",
    consistencyDrift: "Lệch baseline ({{field}}); nghi tráo đổi ngầm",
  },
  status: {
    noAccounts: "Chưa có tài khoản. Hãy thêm trong Quản lý tài khoản trước.",
    needKey: "Chọn tài khoản, nhập khóa API rồi tải mô hình.",
    running: "Đang chạy…",
    copied: "Đã sao chép báo cáo vào clipboard",
    summary: "{{pass}}/{{total}} đạt",
    modelsError: "Tải mô hình thất bại: {{error}}",
  },
  results: { title: "Kết quả" },
}

const NAV = {
  "zh-CN": "站点检测",
  "zh-TW": "站點檢測",
  en: "Site Probing",
  ja: "サイト検査",
  de: "Site-Prüfung",
  "es-419": "Inspección del sitio",
  "pt-BR": "Inspeção do site",
  vi: "Kiểm tra trang",
}

const PAYLOAD = {
  "zh-CN": ZH,
  en: EN,
  de: DE,
  "es-419": ES,
  "pt-BR": PT,
  ja: JA,
  vi: VI,
  "zh-TW": ZH_TW,
}

for (const lang of LANGS) {
  // Merge: keep existing keys from the extract process, overwrite values with correct translations.
  const path = `src/locales/${lang}/siteProbing.json`
  let existing = {}
  try {
    existing = JSON.parse(readFileSync(path, "utf8"))
  } catch {
    /* new file */
  }
  const merged = { ...existing, ...PAYLOAD[lang] }
  // Preserve _examples and other extractor-added metadata at top level.
  for (const key of Object.keys(existing)) {
    if (!(key in merged)) merged[key] = existing[key]
  }
  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n")

  // Update ui.json navigation label.
  const uiPath = `src/locales/${lang}/ui.json`
  const ui = JSON.parse(readFileSync(uiPath, "utf8"))
  ui.navigation = { ...(ui.navigation ?? {}), siteProbing: NAV[lang] }
  writeFileSync(uiPath, JSON.stringify(ui, null, 2) + "\n")

  console.log(`wrote ${lang}`)
}
console.log("all locales written")
