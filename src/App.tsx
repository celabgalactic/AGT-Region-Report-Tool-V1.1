/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  FileText, 
  Download, 
  Settings, 
  Database, 
  AlertCircle, 
  ChevronRight, 
  Table, 
  Columns,
  RefreshCw,
  Info,
  Volume2,
  VolumeX,
  Globe,
  Sliders,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  User,
  Heart,
  Bug
} from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CIVILIZATIONS, GALAXIES } from './constants';
// @ts-ignore
import regionsIcon from './regions-icon.png';

const DB_NAME = 'agt_archive_cache';
const STORE_NAME = 'raw_rows_store';
const DB_VERSION = 1;

const openCacheDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error('Failed to open database cache.'));
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveRowsToCache = async (rows: string[][]): Promise<void> => {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(rows, 'allRawRows');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save rows to IndexedDB.'));
    });
  } catch (err) {
    console.error('IndexedDB save failed:', err);
  }
};

const getRowsFromCache = async (): Promise<string[][] | null> => {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('allRawRows');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to retrieve rows from IndexedDB.'));
    });
  } catch (err) {
    console.error('IndexedDB retrieval failed:', err);
    return null;
  }
};

const formatCacheTimestamp = (timestampStr: string | null) => {
  if (!timestampStr) return null;
  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) return null;
  
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return {
    dateStr: `${day}-${month}-${year}`,
    timeStr: `${hours}:${minutes}`
  };
};

// Column configuration mapping
interface ColumnConfig {
  name: string;
  enabled: boolean;
  colIndex?: number;
}

interface TranslationDict {
  [key: string]: {
    en: string;
    fr: string;
    es: string;
    de: string;
    pt: string;
    th: string;
    hi: string;
    ja: string;
    zh: string;
    it?: string;
  };
}

const TRANSLATIONS: TranslationDict = {
  // Navigation / Title
  "Alliance of Galactic Travellers": {
    en: "Alliance of Galactic Travellers",
    fr: "Alliance des Voyageurs Galactiques",
    es: "Alianza de Viajeros Galácticos",
    de: "Allianz der galaktischen Reisenden",
    pt: "Aliança de Viajantes Galácticos",
    th: "พันธมิตรนักเดินทางแห่งกาแล็กซี",
    hi: "गैलेक्टिक यात्रियों का गठबंधन",
    ja: "銀河旅行者同盟",
    zh: "星际旅行者联盟",
    it: "Alleanza dei Viaggiatori Galattici"
  },
  "Public User": {
    en: "Public User",
    fr: "Utilisateur Public",
    es: "Usuario Público",
    de: "Öffentlicher Benutzer",
    pt: "Usuário Público",
    th: "ผู้ใช้ทั่วไป",
    hi: "सार्वजनिक उपयोगकर्ता",
    ja: "一般ユーザー",
    zh: "公共用户",
    it: "Utente Pubblico"
  },
  "Classified Records Omitted": {
    en: "Classified Records Omitted",
    fr: "Dossiers Classifiés Omis",
    es: "Registros Clasificados Omitidos",
    de: "Klassifizierte Datensätze ausgelassen",
    pt: "Registros Classificados Omitidos",
    th: "ละเว้นบันทึกชั้นความลับ",
    hi: "वर्गीकृत रिकॉर्ड छोड़े गए",
    ja: "省かれた機密レコード",
    zh: "省略机密记录",
    it: "Record Classificati Omessi"
  },
  "Omit Public Records": {
    en: "Omit Public Records",
    fr: "Omettre les Dossiers Publics",
    es: "Omitir Registros Públicos",
    de: "Öffentliche Datensätze auslassen",
    pt: "Omitir Registros Públicos",
    th: "ละเว้นบันทึกสาธารณะ",
    hi: "सार्वजनिक रिकॉर्ड छोड़ें",
    ja: "一般レコードを省略",
    zh: "省略公共记录",
    it: "Ometti Record Pubblici"
  },
  "Omit Private Records": {
    en: "Omit Private Records",
    fr: "Omettre les Dossiers Privés",
    es: "Omitir Registros Privados",
    de: "Private Datensätze auslassen",
    pt: "Omitir Registros Privados",
    th: "ละเว้นบันทึกส่วนตัว",
    hi: "निजी रिकॉर्ड छोड़ें",
    ja: "非公開レコードを省略",
    zh: "省略私有记录",
    it: "Ometti Record Privati"
  },
  "AGT Region Report Tool": {
    en: "AGT Region Report Tool",
    fr: "Outil de Rapport de Région AGT",
    es: "Herramienta de Informe de Región de AGT",
    de: "AGT-Regionsbericht-Tool",
    pt: "Ferramenta de Relatório de Região AGT",
    th: "เครื่องมือรายงานภูมิภาค AGT",
    hi: "AGT क्षेत्र रिपोर्ट उपकरण",
    ja: "AGT リージョンレポートツール",
    zh: "AGT 区域报告工具"
  },
  "STATUS:": {
    en: "STATUS:",
    fr: "STATUT :",
    es: "ESTADO:",
    de: "STATUS:",
    pt: "STATUS:",
    th: "สถานะ:",
    hi: "स्थिति:",
    ja: "ステータス:",
    zh: "状态:"
  },
  "SYNCING": {
    en: "SYNCING",
    fr: "SYNCHRONISATION",
    es: "SINCRONIZANDO",
    de: "SYNCHRONISIEREN",
    pt: "SINCRONIZANDO",
    th: "กำลังซิงค์",
    hi: "सिंक हो रहा है",
    ja: "同期中",
    zh: "同步中"
  },
  "CONNECTED": {
    en: "CONNECTED",
    fr: "CONNECTÉ",
    es: "CONECTADO",
    de: "VERBUNDEN",
    pt: "CONECTADO",
    th: "เชื่อมต่อแล้ว",
    hi: "जुड़ा हुआ",
    ja: "接続済み",
    zh: "已连接"
  },
  "DISCONNECTED": {
    en: "DISCONNECTED",
    fr: "DÉCONNECTÉ",
    es: "DESCONECTADO",
    de: "GETRENNT",
    pt: "DESCONECTADO",
    th: "ตัดการเชื่อมต่อ",
    hi: "डिस्कनेक्ट किया गया",
    ja: "切断済み",
    zh: "已断开"
  },
  "Control Settings": {
    en: "Control Settings",
    fr: "Paramètres de Contrôle",
    es: "Ajustes de Control",
    de: "Steuerungseinstellungen",
    pt: "Configurações de Controle",
    th: "การตั้งค่าควบคุม",
    hi: "नियंत्रण सेटिंग्स",
    ja: "コントロール設定",
    zh: "控制设置"
  },
  "Close": {
    en: "Close",
    fr: "Fermer",
    es: "Cerrar",
    de: "Schließen",
    pt: "Fechar",
    th: "ปิด",
    hi: "बंद करें",
    ja: "閉じる",
    zh: "关闭"
  },
  "Limit Exceeded": {
    en: "Limit Exceeded",
    fr: "Limite Dépassée",
    es: "Límite Excedido",
    de: "Limit überschritten",
    pt: "Limite Excedido",
    th: "เกินขีดจำกัด",
    hi: "सीमा पार हो गई",
    ja: "制限超過",
    zh: "超出限制"
  },
  "PDF Report": {
    en: "PDF Report",
    fr: "Rapport PDF",
    es: "Informe PDF",
    de: "PDF-Bericht",
    pt: "Relatório PDF",
    th: "รายงาน PDF",
    hi: "पीडीएफ रिपोर्ट",
    ja: "PDFレポート",
    zh: "PDF报告",
    it: "Rapporto PDF"
  },
  "Display Settings": {
    en: "Display Settings",
    fr: "Paramètres d'Affichage",
    es: "Ajustes de Pantalla",
    de: "Anzeigeeinstellungen",
    pt: "Configurações de Exibição",
    th: "การตั้งค่าการแสดงผล",
    hi: "प्रदर्शन सेटिंग्स",
    ja: "表示設定",
    zh: "显示设置"
  },
  "Max Records on screen": {
    en: "Max Records on screen",
    fr: "Enregistrements max à l'écran",
    es: "Registros máx. en pantalla",
    de: "Maximale Datensätze auf dem Bildschirm",
    pt: "Registros máx. na tela",
    th: "ระเบียนสูงสุดบนหน้าจอ",
    hi: "स्क्रीन पर अधिकतम रिकॉर्ड",
    ja: "画面上の最大レコード数",
    zh: "屏幕最大记录数"
  },
  "Text Scaling (Desktop Mode)": {
    en: "Text Scaling (Desktop Mode)",
    fr: "Échelle du texte (Mode Bureau)",
    es: "Escala de texto (Modo Escritorio)",
    de: "Textskalierung (Desktop-Modus)",
    pt: "Escalonamento de Texto (Modo Desktop)",
    th: "การปรับขนาดข้อความ (โหมดเดสก์ท็อป)",
    hi: "टेक्स्ट स्केलिंग (डेस्कटॉप मोड)",
    ja: "テキストの拡大縮小 (デスクトップモード)",
    zh: "文本缩放 (桌面模式)"
  },
  "1x (Default)": {
    en: "1x (Default)",
    fr: "1x (Par défaut)",
    es: "1x (Predeterminado)",
    de: "1x (Standard)",
    pt: "1x (Padrão)",
    th: "1 เท่า (เริ่มต้น)",
    hi: "1x (डिफ़ॉल्ट)",
    ja: "1倍 (デフォルト)",
    zh: "1x (默认)"
  },
  "1.5x": {
    en: "1.5x",
    fr: "1.5x",
    es: "1.5x",
    de: "1.5x",
    pt: "1.5x",
    th: "1.5 เท่า",
    hi: "1.5x",
    ja: "1.5倍",
    zh: "1.5x"
  },
  "2x": {
    en: "2x",
    fr: "2x",
    es: "2x",
    de: "2x",
    pt: "2x",
    th: "2 เท่า",
    hi: "2x",
    ja: "2倍",
    zh: "2x"
  },
  "2.5x": {
    en: "2.5x",
    fr: "2.5x",
    es: "2.5x",
    de: "2.5x",
    pt: "2.5x",
    th: "2.5 เท่า",
    hi: "2.5x",
    ja: "2.5倍",
    zh: "2.5x"
  },
  "3x": {
    en: "3x",
    fr: "3x",
    es: "3x",
    de: "3x",
    pt: "3x",
    th: "3 เท่า",
    hi: "3x",
    ja: "3倍",
    zh: "3x"
  },
  "AGT Anthem": {
    en: "AGT Anthem",
    fr: "Hymne de l'AGT",
    es: "Himno de AGT",
    de: "AGT-Hymne",
    pt: "Hino da AGT",
    th: "เพลงสรรเสริญ AGT",
    hi: "AGT गान",
    ja: "AGT 賛歌",
    zh: "AGT 颂歌"
  },
  "Active": {
    en: "Active",
    fr: "Actif",
    es: "Activo",
    de: "Aktiv",
    pt: "Ativo",
    th: "ทำงานอยู่",
    hi: "सक्रिय",
    ja: "有効",
    zh: "启用"
  },
  "Muted": {
    en: "Muted",
    fr: "Muet",
    es: "Silenciado",
    de: "Stumm",
    pt: "Mudo",
    th: "ปิดเสียง",
    hi: "म्यूट",
    ja: "静音",
    zh: "静音"
  },
  "Region DB Source": {
    en: "Region DB Source",
    fr: "Source de la DB de Région",
    es: "Origen de la BD de Regiones",
    de: "Regions-Datenbankquelle",
    pt: "Origem do BD da Região",
    th: "แหล่งฐานข้อมูลภูมิภาค",
    hi: "क्षेत्र DB स्रोत",
    ja: "リージョンDBソース",
    zh: "区域数据库源"
  },
  "Re-Sync Region Data": {
    en: "Re-Sync Region Data",
    fr: "Re-synchroniser les données",
    es: "Resincronizar Datos de Región",
    de: "Regionsdaten neu synchronisieren",
    pt: "Re-sincronizar Dados de Região",
    th: "ซิงค์ข้อมูลภูมิภาคใหม่",
    hi: "क्षेत्र डेटा को फिर से सिंक करें",
    ja: "リージョンデータを再同期",
    zh: "重新同步区域数据"
  },
  "Simple Report": {
    en: "Simple Report",
    fr: "Rapport Simple",
    es: "Informe Simple",
    de: "Einfacher Bericht",
    pt: "Relatório Simples",
    th: "รายงานแบบง่าย",
    hi: "सरल रिपोर्ट",
    ja: "簡易レポート",
    zh: "简单报告"
  },
  "Detailed Report": {
    en: "Detailed Report",
    fr: "Rapport Détaillé",
    es: "Informe Detallado",
    de: "Detaillierter Bericht",
    pt: "Relatório Detalhado",
    th: "รายงานโดยละเอียด",
    hi: "विस्तृत रिपोर्ट",
    ja: "詳細レポート",
    zh: "详细报告"
  },
  "Custom Report": {
    en: "Custom Report",
    fr: "Rapport Personnalisé",
    es: "Informe Personalizado",
    de: "Benutzerdefinierter Bericht",
    pt: "Relatório Personalizado",
    th: "รายงานที่กำหนดเอง",
    hi: "कस्टम रिपोर्ट",
    ja: "カスタムレポート",
    zh: "自定义报告"
  },
  "Custom Report Columns": {
    en: "Custom Report Columns",
    fr: "Colonnes de Rapport Personnalisé",
    es: "Columnas de Informe Personalizado",
    de: "Berichtsspalten Anpassen",
    pt: "Colunas de Relatório Personalizado",
    th: "คอลัมน์รายงานที่กำหนดเอง",
    hi: "कस्टम रिपोर्ट कॉलम",
    ja: "カスタムレポート列",
    zh: "自定义报告列",
    it: "Colonne del Rapporto Personalizzato"
  },
  "Collapse": {
    en: "Collapse",
    fr: "Réduire",
    es: "Contraer",
    de: "Einklappen",
    pt: "Recolher",
    th: "ย่อ",
    hi: "सकुचित करें",
    ja: "折りたたむ",
    zh: "折叠",
    it: "Comprimi"
  },
  "Expand": {
    en: "Expand",
    fr: "Développer",
    es: "Expandir",
    de: "Ausklappen",
    pt: "Expandir",
    th: "ขยาย",
    hi: "विस्तาร करें",
    ja: "展開する",
    zh: "展开",
    it: "Espandi"
  },
  "Select All": {
    en: "Select All",
    fr: "Tout Sélectionner",
    es: "Seleccionar Todo",
    de: "Alle auswählen",
    pt: "Selecionar Tudo",
    th: "เลือกทั้งหมด",
    hi: "सभी चुनें",
    ja: "すべて選択",
    zh: "全选"
  },
  "Click to sort by": {
    en: "Click to sort by",
    fr: "Cliquer pour trier par",
    es: "Haga clic para ordenar por",
    de: "Klicken, um zu sortieren nach",
    pt: "Clique para ordenar por",
    th: "คลิกเพื่อจัดเรียงตาม",
    hi: "क्रमबद्ध करने के लिए क्लिक करें",
    ja: "クリックして並べ替え",
    zh: "点击按此排序"
  },
  "Unselect All": {
    en: "Unselect All",
    fr: "Tout Désélectionner",
    es: "Deseleccionar Todo",
    de: "Alle abwählen",
    pt: "Desmarcar Tudo",
    th: "ยกเลิกการเลือกทั้งหมด",
    hi: "सभी अचयनित करें",
    ja: "すべて選択解除",
    zh: "取消全选"
  },
  "Criteria 1": {
    en: "Criteria 1",
    fr: "Critère 1",
    es: "Criterio 1",
    de: "Kriterium 1",
    pt: "Critério 1",
    th: "เกณฑ์ที่ 1",
    hi: "मानदंड 1",
    ja: "基準 1",
    zh: "标准 1"
  },
  "Select Civilization": {
    en: "Select Civilization",
    fr: "Sélectionner la Civilisation",
    es: "Seleccionar Civilización",
    de: "Zivilisation auswählen",
    pt: "Selecionar Civilização",
    th: "เลือกอารยธรรม",
    hi: "सभ्यता चुनें",
    ja: "文明を選択",
    zh: "选择文明"
  },
  "Criteria 2": {
    en: "Criteria 2",
    fr: "Critère 2",
    es: "Criterio 2",
    de: "Kriterium 2",
    pt: "Critério 2",
    th: "เกณฑ์ที่ 2",
    hi: "मानदंड 2",
    ja: "基準 2",
    zh: "标准 2"
  },
  "Preferred Galaxy": {
    en: "Preferred Galaxy",
    fr: "Galaxie Préférée",
    es: "Galaxia Preferida",
    de: "Bevorzugte Galaxie",
    pt: "Galáxia Preferida",
    th: "กาแล็กซีที่ต้องการ",
    hi: "पसंदीदा आकाशगंगा",
    ja: "好みの銀河",
    zh: "首选星系"
  },
  "Type or select civilization...": {
    en: "Type or select civilization...",
    fr: "Saisir ou choisir la civilisation...",
    es: "Escribe o elige civilización...",
    de: "Zivilisation eingeben oder auswählen...",
    pt: "Digite ou selecione a civilização...",
    th: "พิมพ์หรือเลือกอารยธรรม...",
    hi: "सभ्यता टाइप करें या चुनें...",
    ja: "文明を入力または選択...",
    zh: "输入或选择文明..."
  },
  "Type or select galaxy...": {
    en: "Type or select galaxy...",
    fr: "Saisir ou choisir la galaxie...",
    es: "Escribe o elige galaxia...",
    de: "Galaxie eingeben oder auswählen...",
    pt: "Digite ou selecione a galáxia...",
    th: "พิมพ์หรือเลือกกาแล็กซี...",
    hi: "आकाशगंगा टाइप करें या चुनें...",
    ja: "銀河を入力または選択...",
    zh: "输入或选择星系..."
  },
  "Extract Reports": {
    en: "Extract Reports",
    fr: "Extraire les Rapports",
    es: "Extraer Informes",
    de: "Berichte extrahieren",
    pt: "Extrair Relatórios",
    th: "ดึงรายงาน",
    hi: "रिपोर्ट निकालें",
    ja: "レポートを抽出",
    zh: "提取报告"
  },
  "Processing Galactic Archive...": {
    en: "Processing Galactic Archive...",
    fr: "Traitement de l'Archive Galactique...",
    es: "Procesando Archivo Galáctico...",
    de: "Galaktisches Archiv wird verarbeitet...",
    pt: "Processando Arquivo Galáctico...",
    th: "กำลังประมวลผลคลังข้อมูลกาแล็กซี...",
    hi: "गैलेक्टिक आर्काइव को संसाधित किया जा रहा है...",
    ja: "銀河アーカイブを処理中...",
    zh: "正在处理星际档案..."
  },
  "Terminal Ready": {
    en: "Terminal Ready",
    fr: "Terminal Prêt",
    es: "Terminal Listo",
    de: "Terminal bereit",
    pt: "Terminal Pronto",
    th: "เทอร์มินัลพร้อม",
    hi: "टर्मिनल तैयार",
    ja: "端末準備完了",
    zh: "终端就绪"
  },
  "Report Generation Sequence Pending Civilization Selection": {
    en: "Report Generation Sequence Pending Civilization Selection",
    fr: "Génération de rapport en attente de la sélection de la civilisation",
    es: "Secuencia de Generación de Informe Pendiente de Selección de Civilización",
    de: "Berichtsgenerierungssequenz wartet auf Zivilisationsauswahl",
    pt: "Sequência de Geração de Relatório Pendente de Seleção de Civilização",
    th: "ลำดับการสร้างรายงานอยู่ระหว่างรอการเลือกอารยธรรม",
    hi: "सभ्यता चयन की प्रतीक्षा में रिपोर्ट पीढ़ी अनुक्रम लंबित है",
    ja: "文明の選択待ちのためレポート生成シーケンスは保留中",
    zh: "报告生成序列正等待文明选择"
  },
  "AGT Galactic Archives Results": {
    en: "AGT Galactic Archives Results",
    fr: "Résultats des Archives Galactiques AGT",
    es: "Resultados de Archivos Galácticos de AGT",
    de: "Ergebnisse der galaktischen Archive der AGT",
    pt: "Resultados dos Arquivos Galácticos da AGT",
    th: "ผลลัพธ์คลังข้อมูลกาแล็กซี AGT",
    hi: "AGT गैलेक्टिक आर्काइव परिणाम",
    ja: "AGT 銀河アーカイブ結果",
    zh: "AGT 星际档案结果"
  },
  "FOUND": {
    en: "FOUND",
    fr: "TROUVÉS",
    es: "ENCONTRADOS",
    de: "GEFUNDEN",
    pt: "ENCONTRADOS",
    th: "พบ",
    hi: "मिला",
    ja: "検出",
    zh: "找到"
  },
  "Verified Galactic Ledger Matches": {
    en: "Verified Galactic Ledger Matches",
    fr: "Correspondances du Grand Livre Galactique Vérifiées",
    es: "Coincidencias de Registro Galáctico Verificadas",
    de: "Verifizierte galaktische Hauptbuch-Übereinstimmungen",
    pt: "Correspondências de Livro Razão Galáctico Verificadas",
    th: "ตรวจสอบรายการที่ตรงกันของบัญชีแยกประเภทกาแล็กซีแล้ว",
    hi: "सत्यापित गैलेक्टिक लेजर मिलान",
    ja: "検証された銀河台帳の一致",
    zh: "已验证的星际账本匹配项"
  },
  "Export PDF": {
    en: "Export PDF",
    fr: "Exporter en PDF",
    es: "Exportar PDF",
    de: "PDF exportieren",
    pt: "Exportar PDF",
    th: "ส่งออก PDF",
    hi: "पीडीएफ निर्यात करें",
    ja: "PDF出力",
    zh: "导出 PDF"
  },
  "Export CSV": {
    en: "Export CSV",
    fr: "Exporter en CSV",
    es: "Exportar CSV",
    de: "CSV exportieren",
    pt: "Exportar CSV",
    th: "ส่งออก CSV",
    hi: "सीएसवी निर्यात करें",
    ja: "CSV出力",
    zh: "导出 CSV"
  },
  "TOTAL:": {
    en: "TOTAL:",
    fr: "TOTAL :",
    es: "TOTAL:",
    de: "GESAMT:",
    pt: "TOTAL:",
    th: "รวมทั้งหมด:",
    hi: "कुल:",
    ja: "合計:",
    zh: "总计:"
  },
  "Number of Regions": {
    en: "Number of Regions",
    fr: "Nombre de Régions",
    es: "Número de Regiones",
    de: "Anzahl der Regionen",
    pt: "Número de Regiões",
    th: "จำนวนภูมิภาค",
    hi: "क्षेत्रों की संख्या",
    ja: "リージョン数",
    zh: "区域数量"
  },
  "Showing Page": {
    en: "Showing Page",
    fr: "Affichage de la page",
    es: "Mostrando Página",
    de: "Zeige Seite",
    pt: "Mostrando Página",
    th: "แสดงหน้า",
    hi: "पृष्ठ दिखा रहा है",
    ja: "ページ表示",
    zh: "显示第"
  },
  "of": {
    en: "of",
    fr: "sur",
    es: "de",
    de: "von",
    pt: "de",
    th: "จาก",
    hi: "का",
    ja: " / ",
    zh: "页，共"
  },
  "total rows": {
    en: "total rows",
    fr: "lignes au total",
    es: "filas totales",
    de: "Zeilen insgesamt",
    pt: "linhas no total",
    th: "แถวทั้งหมด",
    hi: "कुल पंक्तियाँ",
    ja: "総行数",
    zh: "行记录"
  },
  "First": {
    en: "First",
    fr: "Premier",
    es: "Primero",
    de: "Erste",
    pt: "Primeiro",
    th: "หน้าแรก",
    hi: "पहला",
    ja: "最初",
    zh: "第一页"
  },
  "Prev": {
    en: "Prev",
    fr: "Préc",
    es: "Ant",
    de: "Zurück",
    pt: "Anterior",
    th: "ก่อนหน้า",
    hi: "पिछला",
    ja: "前へ",
    zh: "上一页"
  },
  "Next": {
    en: "Next",
    fr: "Suiv",
    es: "Sig",
    de: "Weiter",
    pt: "Próximo",
    th: "ถัดไป",
    hi: "अगला",
    ja: "次へ",
    zh: "下一页"
  },
  "Last": {
    en: "Last",
    fr: "Dernier",
    es: "Último",
    de: "Letzte",
    pt: "Último",
    th: "หน้าสุดท้าย",
    hi: "अंतिम",
    ja: "最後",
    zh: "最后一页"
  },
  "Ledger Integrity: Verified": {
    en: "Ledger Integrity: Verified",
    fr: "Intégrité du Grand Livre : Vérifiée",
    es: "Integridad de Registro: Verificada",
    de: "Hauptbuchintegrität: Verifiziert",
    pt: "Integridade do Livro Razão: Verificada",
    th: "ความสมบูรณ์ของบัญชีแยกประเภท: ตรวจสอบแล้ว",
    hi: "लेजर अखंडता: सत्यापित",
    ja: "台帳データ整合性: 検証済み",
    zh: "账本完整性：已验证"
  },
  "Index Reference:": {
    en: "Index Reference:",
    fr: "Référence d'Index :",
    es: "Referencia de Índice:",
    de: "Indexreferenz:",
    pt: "Referência de Índice:",
    th: "การอ้างอิงดัชนี:",
    hi: "अनुक्रमणिका संदर्भ:",
    ja: "インデックス参照:",
    zh: "索引主键："
  },
  "AGT SECURE ARCHIVE CLIENT": {
    en: "AGT SECURE ARCHIVE CLIENT",
    fr: "CLIENT D'ARCHIVES SÉCURISÉES AGT",
    es: "CLIENTE DE ARCHIVO SEGURO DE AGT",
    de: "AGT SICHERER ARCHIV-CLIENT",
    pt: "CLIENTE DE ARQUIVO SEGURO DA AGT",
    th: "ไคลเอนต์จัดเก็บข้อมูลที่ปลอดภัยของ AGT",
    hi: "AGT सुरक्षित आर्काइव क्लाइंट",
    ja: "AGT セキュアアーカイブクライアント",
    zh: "AGT 安全档案客户端"
  },
  "Select Language": {
    en: "Select Language",
    fr: "Choisir la Langue",
    es: "Seleccionar Idioma",
    de: "Sprache auswählen",
    pt: "Selecionar Idioma",
    th: "เลือกภาษา",
    hi: "भाषा चुनें",
    ja: "言語を選択",
    zh: "选择语言"
  },
  "Show All": {
    en: "Show All",
    fr: "Tout Afficher",
    es: "Mostrar Todo",
    de: "Alle anzeigen",
    pt: "Mostrar Tudo",
    th: "แสดงทั้งหมด",
    hi: "सभी दिखाएं",
    ja: "すべて表示",
    zh: "显示全部"
  },
  "Region Name": {
    en: "Region Name",
    fr: "Nom de la Région",
    es: "Nombre de la Región",
    de: "Regionsname",
    pt: "Nome da Região",
    th: "ชื่อภูมิภาค",
    hi: "क्षेत्र का नाम",
    ja: "リージョン名",
    zh: "区域名称"
  },
  "Galaxy": {
    en: "Galaxy",
    fr: "Galaxie",
    es: "Galaxia",
    de: "Galaxie",
    pt: "Galáxia",
    th: "กาแล็กซี",
    hi: "आकाशगंगा",
    ja: "銀河",
    zh: "星系"
  },
  "Civilization": {
    en: "Civilization",
    fr: "Civilisation",
    es: "Civilización",
    de: "Zivilisation",
    pt: "Civilização",
    th: "อารยธรรม",
    hi: "สभ्यता",
    ja: "文明",
    zh: "文明"
  },
  "Platform": {
    en: "Platform",
    fr: "Plateforme",
    es: "Plataforma",
    de: "Plattform",
    pt: "Plataforma",
    th: "แพลตฟอร์ม",
    hi: "प्लेटफ़ॉर्म",
    ja: "プラットフォーム",
    zh: "平台"
  },
  "Points": {
    en: "Points",
    fr: "Points",
    es: "Puntos",
    de: "Punkte",
    pt: "Pontos",
    th: "คะแนน",
    hi: "अंक",
    ja: "ポイント",
    zh: "积分"
  },
  "NMS Wiki Link": {
    en: "NMS Wiki Link",
    fr: "Lien Wiki NMS",
    es: "Enlace de Wiki de NMS",
    de: "NMS-Wiki-Link",
    pt: "Link da Wiki do NMS",
    th: "ลิงก์ NMS Wiki",
    hi: "NMS विकी लिंक",
    ja: "NMS Wikiリンク",
    zh: "NMS百科链接"
  },
  "15 Records": {
    en: "15 Records",
    fr: "15 Enregistrements",
    es: "15 Registros",
    de: "15 Datensätze",
    pt: "15 Registros",
    th: "15 ระเบียน",
    hi: "15 रिकॉर्ड",
    ja: "15レコード",
    zh: "15 条记录"
  },
  "30 Records": {
    en: "30 Records",
    fr: "30 Enregistrements",
    es: "30 Registros",
    de: "30 Datensätze",
    pt: "30 Registros",
    th: "30 ระเบียน",
    hi: "30 रिकॉर्ड",
    ja: "30レコード",
    zh: "30 条记录"
  },
  "50 Records": {
    en: "50 Records",
    fr: "50 Enregistrements",
    es: "50 Registros",
    de: "50 Datensätze",
    pt: "50 Registros",
    th: "50 ระเบียน",
    hi: "50 रिकॉर्ड",
    ja: "50レコード",
    zh: "50 条记录"
  },
  "100 Records": {
    en: "100 Records",
    fr: "100 Enregistrements",
    es: "100 Registros",
    de: "100 Datensätze",
    pt: "100 Registros",
    th: "100 ระเบียน",
    hi: "100 रिकॉर्ड",
    ja: "100レコード",
    zh: "100 条记录"
  },
  "Home": {
    en: "Home",
    fr: "Accueil",
    es: "Inicio",
    de: "Startseite",
    pt: "Início",
    th: "หน้าแรก",
    hi: "पहला",
    ja: "最初",
    zh: "首页"
  },
  "About": {
    en: "About",
    fr: "À propos",
    es: "Acerca de",
    de: "Über uns",
    pt: "Sobre",
    th: "เกี่ยวกับ",
    hi: "के बारे में",
    ja: "概要",
    zh: "关于"
  },
  "Team": {
    en: "Team",
    fr: "Équipe",
    es: "Equipo",
    de: "Team",
    pt: "Equipe",
    th: "ทีมงาน",
    hi: "टीम",
    ja: "チーム",
    zh: "团队"
  },
  "Contribute": {
    en: "Contribute",
    fr: "Contribuer",
    es: "Contribuir",
    de: "Beitragen",
    pt: "Contribuir",
    th: "สนับสนุน",
    hi: "योगदान दें",
    ja: "貢献",
    zh: "贡献",
    it: "Contribuire"
  },
  "Cached": {
    en: "Cached",
    fr: "Mis en cache",
    es: "Guardado en caché",
    de: "Im Cache",
    pt: "Em cache",
    th: "แคชไว้",
    hi: "कैश किया हुआ",
    ja: "キャッシュ済み",
    zh: "已缓存",
    it: "In cache"
  },
  "Last Cache": {
    en: "Last Cache",
    fr: "Dernier cache",
    es: "Última caché",
    de: "Letzter Cache",
    pt: "Último cache",
    th: "แคชล่าสุด",
    hi: "अंतिम कैश",
    ja: "最終キャッシュ",
    zh: "上次缓存",
    it: "Ultima cache"
  },
  "Galactic Archives": {
    en: "Galactic Archives",
    fr: "Archives Galactiques",
    es: "Archivos Galácticos",
    de: "Galaktische Archive",
    pt: "Arquivos Galácticos",
    th: "คลังข้อมูลกาแล็กซี",
    hi: "गैलेक्टिक आर्कायव्स",
    ja: "銀河アーカイブ",
    zh: "星系档案"
  },
  "Engage": {
    en: "Engage",
    fr: "S'engager",
    es: "Participar",
    de: "Beteiligen",
    pt: "Engajar",
    th: "เข้าร่วม",
    hi: "जुड़ें",
    ja: "参加",
    zh: "参与"
  },
  "Support": {
    en: "Support",
    fr: "Support",
    es: "Soporte",
    de: "Support",
    pt: "Suporte",
    th: "ช่วยเหลือ",
    hi: "समर्थन",
    ja: "サポート",
    zh: "支持"
  },
  "Terms": {
    en: "Terms",
    fr: "Conditions",
    es: "Términos",
    de: "Bedingungen",
    pt: "Termos",
    th: "ข้อตกลง",
    hi: "शर्तें",
    ja: "利用規約",
    zh: "条款"
  },
  "Copyright": {
    en: "Copyright",
    fr: "Droit d'auteur",
    es: "Derechos de autor",
    de: "Copyright",
    pt: "Copyright",
    th: "ลิขสิทธิ์",
    hi: "कॉपीराइट",
    ja: "著作権",
    zh: "版权"
  },
  "Reset Fields": {
    en: "Reset Fields",
    fr: "Réinitialiser",
    es: "Restablecer Campos",
    de: "Felder zurücksetzen",
    pt: "Redefinir Campos",
    th: "ล้างข้อมูล",
    hi: "क्षेत्र रीसेट करें",
    ja: "フィールドをリセット",
    zh: "重置表单"
  },
  "Reset": {
    en: "Reset",
    fr: "Réinitialiser",
    es: "Restablecer",
    de: "Zurücksetzen",
    pt: "Redefinir",
    th: "รีเซ็ต",
    hi: "रीसेट",
    ja: "リセット",
    zh: "重置",
    it: "Ripristina"
  },
  "Priority": {
    en: "Priority",
    fr: "Priorité",
    es: "Prioridad",
    de: "Priorität",
    pt: "Prioridade",
    th: "ลำดับความสำคัญ",
    hi: "प्राथमिकता",
    ja: "優先度",
    zh: "优先级",
    it: "Priorità"
  },
  "All Priorities": {
    en: "All Priorities",
    fr: "Toutes les priorités",
    es: "Todas las prioridades",
    de: "Alle Prioritäten",
    pt: "Todas as prioridades",
    th: "ลำดับความสำคัญทั้งหมด",
    hi: "सभी प्राथमिकताएँ",
    ja: "すべての優先度",
    zh: "所有优先级",
    it: "Tutte le priorità"
  },
  "Priority No": {
    en: "No",
    fr: "Non",
    es: "No",
    de: "Nein",
    pt: "Não",
    th: "ไม่",
    hi: "नहीं",
    ja: "なし",
    zh: "无",
    it: "No"
  },
  "Priority Low": {
    en: "Low",
    fr: "Basse",
    es: "Baja",
    de: "Niedrig",
    pt: "Baixa",
    th: "ต่ำ",
    hi: "कम",
    ja: "低",
    zh: "低",
    it: "Bassa"
  },
  "Priority Medium": {
    en: "Medium",
    fr: "Moyenne",
    es: "Media",
    de: "Mittel",
    pt: "Média",
    th: "ปานกลาง",
    hi: "मध्यम",
    ja: "中",
    zh: "中",
    it: "Media"
  },
  "Priority High": {
    en: "High",
    fr: "Haute",
    es: "Alta",
    de: "Hoch",
    pt: "Alta",
    th: "สูง",
    hi: "उच्च",
    ja: "高",
    zh: "高",
    it: "Alta"
  }
};

// Column configuration mapping
interface ColumnConfig {
  name: string;
  enabled: boolean;
  colIndex?: number;
}

const AVAILABLE_CUSTOM_TOGGLES = [
  { idx: 1, letter: 'B', label: 'Galaxy' },
  { idx: 2, letter: 'C', label: 'Civilized' },
  { idx: 3, letter: 'D', label: 'Coordinates' },
  { idx: 4, letter: 'E', label: 'Quadrant' },
  { idx: 9, letter: 'J', label: 'Game Release' },
  { idx: 10, letter: 'K', label: 'Earliest Surveyor' },
  { idx: 11, letter: 'L', label: 'Latest Surveyor' },
  { idx: 12, letter: 'M', label: 'Latest Survey' },
  { idx: 13, letter: 'N', label: 'Summary Notes' },
  { idx: 14, letter: 'O', label: 'Location Notes' },
  { idx: 15, letter: 'P', label: 'Additional Notes' },
  { idx: 16, letter: 'Q', label: 'Civilized Notes' },
  { idx: 18, letter: 'S', label: 'Region Age' },
  { idx: 19, letter: 'T', label: 'Lowest Known Phantom System' },
  { idx: 20, letter: 'U', label: 'Wiki Link' },
  { idx: 21, letter: 'V', label: 'External Link' },
  { idx: 22, letter: 'W', label: 'Video Link' },
  { idx: 23, letter: 'X', label: 'Light Year Estimate' },
  { idx: 31, letter: 'AF', label: 'Legacy Name' },
  { idx: 32, letter: 'AG', label: 'Legacy Wiki Link' },
  { idx: 42, letter: 'AQ', label: 'Priority' }
];

const getColumnStyle = (colIndex: number | undefined) => {
  if (colIndex === undefined) return undefined;

  // Priority (AQ) Style
  if (colIndex === 42) {
    return {
      width: 'calc(10ch + 1.5rem)',
      minWidth: 'calc(8ch + 1.5rem)',
      maxWidth: 'calc(12ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  // Link / URL columns (U, V, W, AG)
  if (colIndex === 20 || colIndex === 21 || colIndex === 22 || colIndex === 32) {
    return { 
      width: 'calc(4ch + 2rem)', 
      minWidth: 'calc(4ch + 2rem)', 
      maxWidth: 'calc(4ch + 2rem)' 
    };
  }
  
  // Column T (Lowest Known Phantom System) - never require more than 3 characters in row data
  // Header: "Lowest Known Phantom System"
  // Optimal two-line split: "Lowest Known" (12ch) / "Phantom System" (14ch)
  // Max word length: "Phantom" (7ch) or "System" (6ch).
  // Min column width is set to at least 15.5ch to fit the longest line with sort icon buffer.
  if (colIndex === 19) {
    return { 
      width: 'calc(16ch + 1.5rem)', 
      minWidth: 'calc(15.5ch + 1.5rem)', 
      maxWidth: 'calc(18ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  // Column S (Region Age) - never require more than 4 characters in row data
  // Header: "Region Age"
  // Two-line split: "Region" (6ch) / "Age" (3ch)
  // Min width is set with sort icon buffer to prevent mid-word break and keep within 2 lines.
  if (colIndex === 18) {
    return { 
      width: 'calc(8ch + 1.5rem)', 
      minWidth: 'calc(7.5ch + 1.5rem)', 
      maxWidth: 'calc(10ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  // Column M (Auto Latest Survey) - never require more than 11 characters in row data
  // Header: "Auto Latest Survey" (18ch)
  // Two-line split: "Auto Latest" (11ch) / "Survey" (6ch)
  if (colIndex === 12) {
    return { 
      width: 'calc(14ch + 1.5rem)', 
      minWidth: 'calc(12.5ch + 1.5rem)', 
      maxWidth: 'calc(16ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  // Column X (Light Years Estimate) - never require more than 9 characters in row data
  // Header: "Light Year Estimate" (19ch)
  // Two-line split: "Light Year" (10ch) or "Light Years" (11ch) / "Estimate" (8ch)
  if (colIndex === 23) {
    return { 
      width: 'calc(13ch + 1.5rem)', 
      minWidth: 'calc(12.5ch + 1.5rem)', 
      maxWidth: 'calc(15ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  // Galaxy (B) - auto adjusted to be narrower
  // Header: "Galaxy" (6ch)
  if (colIndex === 1) {
    return { 
      width: 'calc(10ch + 1.5rem)', 
      minWidth: 'calc(8ch + 1.5rem)', 
      maxWidth: 'calc(12ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  // Earliest Surveyor (K) - auto adjusted to be narrower
  // Header: "Earliest Surveyor" (17ch)
  // Two-line split: "Earliest" (8ch) / "Surveyor" (8ch)
  if (colIndex === 10) {
    return { 
      width: 'calc(12ch + 1.5rem)', 
      minWidth: 'calc(10ch + 1.5rem)', 
      maxWidth: 'calc(14ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  // Latest Surveyor (L) - auto adjusted to be narrower
  // Header: "Latest Surveyor" (15ch)
  // Two-line split: "Latest" (6ch) / "Surveyor" (8ch)
  if (colIndex === 11) {
    return { 
      width: 'calc(12ch + 1.5rem)', 
      minWidth: 'calc(10ch + 1.5rem)', 
      maxWidth: 'calc(14ch + 1.5rem)',
      boxSizing: 'border-box' as const
    };
  }
  
  return undefined;
};

// --- AGT Traveller Verification & Cookies Helpers ---

export const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export const getSecurityLevel = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim().toLowerCase();
  
  if (str === 'public' || str === '0') return 0;
  if (str === 'private' || str === '1') return 1;
  if (str === 'restricted' || str === '2') return 2;
  if (str === 'top secret' || str === '3') return 3;
  if (str === 'slt restricted' || str === '4') return 4;
  if (str === 'scc restricted' || str === '5') return 5;
  
  if (str.includes('scc')) return 5;
  if (str.includes('slt')) return 4;
  if (str.includes('top secret') || str.includes('topsecret')) return 3;
  if (str.includes('restricted')) return 2;
  if (str.includes('private')) return 1;
  if (str.includes('public')) return 0;
  
  return 0; // Default is Public
};

export const getSecurityLevelColor = (level: number): string => {
  switch (level) {
    case 1: return "text-[#00F4FF] border-[#00F4FF] bg-[#00F4FF]/10 shadow-[0_0_8px_rgba(0,244,255,0.25)]";
    case 2: return "text-[#F198E2] border-[#F198E2] bg-[#F198E2]/10 shadow-[0_0_8px_rgba(241,152,226,0.25)]";
    case 3: return "text-[#FD0303] border-[#FD0303] bg-[#FD0303]/10 shadow-[0_0_8px_rgba(253,3,3,0.25)]";
    case 4: return "text-[#FF9300] border-[#FF9300] bg-[#FF9300]/10 shadow-[0_0_8px_rgba(255,147,0,0.25)]";
    case 5: return "text-[#3287F0] border-[#3287F0] bg-[#3287F0]/10 shadow-[0_0_8px_rgba(50,135,240,0.25)]";
    case 0:
    default: return "text-[#2AFF00] border-[#2AFF00] bg-[#2AFF00]/10 shadow-[0_0_8px_rgba(42,255,0,0.25)]";
  }
};

export const decodeXOR = (encodedText: string): string => {
  const key = 969; 
  let decoded = ""; 
  for (let i = 0; i < encodedText.length; i++) { 
    let charCode = encodedText.charCodeAt(i); 
    let originalCharCode = charCode ^ key; 
    decoded += String.fromCharCode(originalCharCode); 
  } 
  return decoded; 
};

export interface VerificationResult {
  success: boolean;
  securityLevel?: number;
  error?: string;
}

export const verifyTravellerCredentials = async (nameInput: string, idInput: string): Promise<VerificationResult> => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOZq3Cl2e0aNqzXdLRe63HuM7PlqGH3HnS_-0x6P_CYnGDJlK5QvI-YjU0lNaOgLyp3uoktS4WIXyK/pub?gid=505079663&single=true&output=tsv";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not fetch VerifyID sheet");
    const tsvText = await res.text();
    
    // Split by lines, then by tabs since it's TSV format
    const rows = tsvText.split(/\r?\n/).map(line => line.split('\t'));
    const cleanName = nameInput.trim();
    const cleanId = idInput.trim();
    
    let matchedRow: string[] | null = null;
    for (const r of rows) {
      if (r[0] && r[0].trim() === cleanName) {
        matchedRow = r;
        break;
      }
    }
    
    if (!matchedRow) {
      return { success: false, error: 'mismatch' };
    }
    
    const encodedB = matchedRow[1] || '';
    const decodedB = decodeXOR(encodedB).trim();
    
    if (decodedB !== cleanId) {
      return { success: false, error: 'mismatch' };
    }
    
    const secLevelVal = matchedRow[2]?.trim() || '';
    const numericLevel = getSecurityLevel(secLevelVal);
    
    return { success: true, securityLevel: numericLevel };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'fetch_error' };
  }
};

export default function App() {
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem('sheet_reporter_url');
    const oldDefault = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSWiJE26JMTHgjGeZfpfTrwT1HL2ZnXIqiOVkNs-V8wtDkGE7ey0Q9hnAM-bpMhy475q45qHa09o2vC/pub?gid=0&single=true&output=csv';
    const newDefault = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0jFq80ut0o5jtApdhRG8sR2CIufVn0FNcugR_7fdCIfrDRfgB9s-SvEhBAePrQCibr1RcxFVoXj7o/pub?gid=354119689&single=true&output=tsv';
    
    if (!saved || saved === oldDefault) return newDefault;
    return saved;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [textScale, setTextScale] = useState<string>(() => {
    return localStorage.getItem('agt_text_scale') || '1';
  });
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('agt_audio_enabled');
    return saved === 'true'; // Default to false (muted) unless explicitly saved as 'true'
  });
  const [customReportToggles, setCustomReportToggles] = useState<{ [key: number]: boolean }>(() => {
    const saved = localStorage.getItem('agt_custom_report_toggles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      1: true,   // B
      2: true,   // C
      3: true,   // D
      4: true,   // E
      9: true,   // J
      10: true,  // K
      11: true,  // L
      12: true,  // M
      13: true,  // Summary Notes (N)
      14: true,  // Location Notes (O)
      15: true,  // Additional Notes (P)
      16: true,  // Civilized Notes (Q)
      18: true,  // Region Age (S)
      19: true,  // Lowest Known Phantom System (T)
      20: true,  // Wiki Link (U)
      21: true,  // External Link (V)
      22: true,  // W (Video Link)
      23: true,  // Light Year Estimate (X)
      31: true,  // Legacy Name (AF)
      32: true,  // Legacy Wiki Link (AG)
      42: true,  // Priority (AQ)
    };
  });

  useEffect(() => {
    localStorage.setItem('agt_custom_report_toggles', JSON.stringify(customReportToggles));
  }, [customReportToggles]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [pdfErrorMsg, setPdfErrorMsg] = useState<string | null>(null);

  // Traveller Identity Verification States
  const [settingsTravellerName, setSettingsTravellerName] = useState<string>(() => getCookie('travellerName') || '');
  const [settingsTravellerId, setSettingsTravellerId] = useState<string>(() => getCookie('travellerId') || '');
  const [activeTravellerName, setActiveTravellerName] = useState<string>(() => getCookie('travellerName') || '');
  const [activeTravellerId, setActiveTravellerId] = useState<string>(() => getCookie('travellerId') || '');
  const [activeSecurityLevel, setActiveSecurityLevel] = useState<number>(() => {
    const lvl = parseInt(getCookie('securityLevel') || '', 10);
    return isNaN(lvl) ? 0 : lvl;
  });
  const [omitPublicRecords, setOmitPublicRecords] = useState<boolean>(false);
  const [omitPrivateRecords, setOmitPrivateRecords] = useState<boolean>(false);
  const [classifiedOmittedCount, setClassifiedOmittedCount] = useState<number>(0);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [isGeneratingFile, setIsGeneratingFile] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [customColumnsExpanded, setCustomColumnsExpanded] = useState<boolean>(false);
  const [verifyValidationError, setVerifyValidationError] = useState<string | null>(null);
  const [popupMsg, setPopupMsg] = useState<React.ReactNode | null>(null);

  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(() => localStorage.getItem('db_cache_timestamp'));
  const [isUsingCache, setIsUsingCache] = useState<boolean>(false);

  // Initial fetch and manual font loading
  useEffect(() => {
    const initData = async () => {
      const storedTimestamp = localStorage.getItem('db_cache_timestamp');
      if (storedTimestamp && sheetUrl) {
        setLoading(true);
        try {
          const cachedRows = await getRowsFromCache();
          if (cachedRows && cachedRows.length >= 2) {
            setAllRawRows(cachedRows);
            setIsUsingCache(true);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Failed to load cache:', err);
        }
      }
      
      // If no cache or cache failed to load, fetch from network
      if (sheetUrl) {
        fetchData();
      }
    };

    initData();

    // Manual font loading reinforcement with local font
    const font = new FontFace('Geonms', 'url(/NMSFuturaProBook_Kerned.ttf)');
    font.load().then((loadedFont) => {
      // @ts-ignore
      document.fonts.add(loadedFont);
      document.documentElement.style.fontFamily = '"Geonms", "Inter", sans-serif';
    }).catch(err => {
      console.warn('Geonms font load failed, falling back to Inter:', err);
    });
  }, []);

  // Background Audio Management
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioEnabled && audioRef.current) {
        audioRef.current.volume = 0.4;
        audioRef.current.play().catch(() => {});
      }
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('mousedown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [audioEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      if (audioEnabled) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
    localStorage.setItem('agt_audio_enabled', String(audioEnabled));
  }, [audioEnabled]);

  const handleManualPlay = () => {
    if (audioEnabled && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  const [language, setLanguage] = useState<'en' | 'fr' | 'es' | 'de' | 'pt' | 'th' | 'zh' | 'hi' | 'ja' | 'it'>(() => {
    let saved = localStorage.getItem('agt_language') as any;
    if (saved === 'ru') saved = 'th';
    return saved || 'en';
  });

  const t = (key: string): string => {
    const normalizedKey = key.trim();
    const entry = TRANSLATIONS[normalizedKey];
    if (entry && entry[language]) {
      return entry[language];
    }
    if (entry && entry['en']) {
      return entry['en'];
    }
    // Try case-insensitive lookup
    for (const k of Object.keys(TRANSLATIONS)) {
      if (k.toLowerCase() === normalizedKey.toLowerCase()) {
        return TRANSLATIONS[k][language] || TRANSLATIONS[k]['en'] || key;
      }
    }
    return key;
  };

  const [searchKey, setSearchKey] = useState('');
  const [isCivDropdownOpen, setIsCivDropdownOpen] = useState(false);
  const [activeCivIndex, setActiveCivIndex] = useState(0);
  const civAutocompleteRef = useRef<HTMLDivElement>(null);

  const [selectedGalaxy, setSelectedGalaxy] = useState('All');
  const [isGalaxyDropdownOpen, setIsGalaxyDropdownOpen] = useState(false);
  const [activeGalaxyIndex, setActiveGalaxyIndex] = useState(0);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const [selectedPriority, setSelectedPriority] = useState('All');

  const [allRawRows, setAllRawRows] = useState<string[][]>([]);

  const dynamicCivilizations = useMemo(() => {
    const civSet = new Set<string>();
    if (allRawRows && allRawRows.length >= 2) {
      allRawRows.slice(2).forEach(row => {
        const colA = String(row[0] || '').trim();
        if (colA !== '' && !colA.startsWith('SKIPROW')) {
          const civVal = String(row[2] || '').trim();
          if (civVal) {
            civSet.add(civVal);
          }
        }
      });
    }
    return Array.from(civSet);
  }, [allRawRows]);

  const allCivilizations = useMemo(() => {
    const combined = new Set<string>(CIVILIZATIONS);
    dynamicCivilizations.forEach(civ => combined.add(civ));
    return Array.from(combined);
  }, [dynamicCivilizations]);

  const filteredCivilizations = useMemo(() => {
    const inputVal = searchKey.trim().toLowerCase();
    const options = ['All', ...allCivilizations];
    if (!inputVal) {
      return options.slice(0, 50);
    }
    const filtered = options.filter(civ => civ.toLowerCase().includes(inputVal));
    return filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(inputVal);
      const bStarts = bLower.startsWith(inputVal);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aLower.localeCompare(bLower);
    }).slice(0, 50);
  }, [searchKey, allCivilizations]);

  const filteredGalaxies = useMemo(() => {
    const inputVal = selectedGalaxy.trim().toLowerCase();
    const options = ['All', ...GALAXIES];
    if (!inputVal) {
      return options.slice(0, 50);
    }
    const filtered = options.filter(gal => gal.toLowerCase().includes(inputVal));
    return filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(inputVal);
      const bStarts = bLower.startsWith(inputVal);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aLower.localeCompare(bLower);
    }).slice(0, 50);
  }, [selectedGalaxy]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsGalaxyDropdownOpen(false);
      }
      if (civAutocompleteRef.current && !civAutocompleteRef.current.contains(e.target as Node)) {
        setIsCivDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [reportType, setReportType] = useState<'Simple' | 'Detailed' | 'Custom'>('Simple');
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedRecords, setMatchedRecords] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset to first page when search filters or matches change
  useEffect(() => {
    setCurrentPage(1);
  }, [matchedRecords]);

  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const totalPages = Math.ceil(matchedRecords.length / itemsPerPage);

  const sortedAndMatchedRecords = useMemo(() => {
    if (!sortColumn) return matchedRecords;
    return [...matchedRecords].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      
      // Attempt numerical comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      
      const strA = String(valA || '').trim().toLowerCase();
      const strB = String(valB || '').trim().toLowerCase();
      
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [matchedRecords, sortColumn, sortDirection]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndMatchedRecords.slice(start, start + itemsPerPage);
  }, [sortedAndMatchedRecords, currentPage, itemsPerPage]);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  useEffect(() => {
    if (tableContainerRef.current) {
      const timer = setTimeout(() => {
        if (tableContainerRef.current) {
          setTableScrollWidth(tableContainerRef.current.scrollWidth);
          setContainerWidth(tableContainerRef.current.clientWidth);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [paginatedRecords, columns]);

  useEffect(() => {
    const handleResize = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth);
        setContainerWidth(tableContainerRef.current.clientWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tableContainerRef.current) {
      observer = new ResizeObserver(() => {
        if (tableContainerRef.current) {
          setTableScrollWidth(tableContainerRef.current.scrollWidth);
          setContainerWidth(tableContainerRef.current.clientWidth);
        }
      });
      observer.observe(tableContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, []);

  const isScrollNeeded = tableScrollWidth > containerWidth && containerWidth > 0;

  const toggleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null); // Reset sort to default (none)
      }
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  };

  // Save sheet URL to localStorage
  useEffect(() => {
    if (sheetUrl) {
      localStorage.setItem('sheet_reporter_url', sheetUrl);
    }
  }, [sheetUrl]);

  const fetchData = async () => {
    if (!sheetUrl) {
      setError('Please provide a Google Sheet CSV URL in settings.');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setIsSyncing(true);
    setError(null);
    setMatchedRecords([]);

    try {
      // Handle the case where the user might paste a regular sheet URL instead of a pub link
      let fetchUrl = sheetUrl;
      if (sheetUrl.includes('docs.google.com/spreadsheets/') && !sheetUrl.includes('pub?')) {
        // Try to convert regular URL to CSV export if possible, 
        // though "Publish to Web" is the official way.
        if (sheetUrl.includes('/edit')) {
          fetchUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
        }
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Failed to fetch sheet data. Is it published to the web?');
      
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        delimiter: fetchUrl.includes('output=tsv') ? '\t' : undefined,
        complete: async (results) => {
          const rawRows = results.data as string[][];
          if (rawRows.length < 2) {
            setError('The source sheet data is insufficient (need at least 2 rows).');
            setLoading(false);
            setIsSyncing(false);
            return;
          }

          setAllRawRows(rawRows);
          
          try {
            const now = new Date().toISOString();
            localStorage.setItem('db_cache_timestamp', now);
            setCacheTimestamp(now);
            await saveRowsToCache(rawRows);
          } catch (err) {
            console.error('Failed to cache synced database:', err);
          }

          setIsUsingCache(false);
          setLoading(false);
          setIsSyncing(false);
        },
        error: (err: any) => {
          setError(`Parsing error: ${err.message}`);
          setLoading(false);
          setIsSyncing(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // Process rows whenever report type, customReportToggles or raw rows change
  useEffect(() => {
    if (allRawRows.length >= 2) {
      const headers = allRawRows[1];
      const targetIndexes = reportType === 'Simple'
        ? [0, 1, 2, 3, 9, 10, 20] // A, B, C, D, J, K, U
        : reportType === 'Detailed'
        ? [0, 1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 31, 32] // A, B, C, D, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, AF, AG
        : [0, ...[1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 31, 32, 42].filter(idx => customReportToggles[idx])]; // Custom report: A (0) is always first, plus active toggles

      const filteredColumns = targetIndexes.map(idx => {
        let baseName = headers[idx] || `Col ${String.fromCharCode(65 + idx)}`;
        if (idx === 31) baseName = headers[31] || "AF";
        if (idx === 32) baseName = headers[32] || "AG";
        if (idx === 42) baseName = headers[42] || "AQ";
        return {
          name: baseName,
          enabled: true,
          colIndex: idx
        };
      });

      setColumns(filteredColumns);

      const processedData = allRawRows.slice(2)
        .filter(row => {
          const colA = String(row[0] || '').trim();
          return colA !== '' && !colA.startsWith('SKIPROW');
        })
        .map(row => {
          const rowObj: any = {};
          targetIndexes.forEach((colIdx, listIdx) => {
            const headerName = filteredColumns[listIdx].name;
            rowObj[headerName] = row[colIdx] || '';
          });
          // Store security classification from Column AE (index 30)
          rowObj._securityClass = row[30] || '';
          // Store priority classification from Column AQ (index 42)
          rowObj._priority = row[42] || '';
          return rowObj;
        });

      setData(processedData);

      findRecord(processedData, filteredColumns, searchKey, selectedGalaxy, selectedPriority);
    }
  }, [reportType, customReportToggles, allRawRows, activeTravellerName, activeTravellerId, activeSecurityLevel, omitPublicRecords, omitPrivateRecords, searchKey, selectedGalaxy, selectedPriority]);

  const handleSearch = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      if (!data.length) {
        fetchData();
      } else {
        findRecord(data, columns);
      }
    }, 1500);
  };

  const findRecord = (sourceData: any[], sourceCols: ColumnConfig[], civTerm?: string, galTerm?: string, priorityTerm?: string) => {
    let currentCivTerm = (civTerm ?? searchKey).trim().toLowerCase();
    let currentGalTerm = (galTerm ?? selectedGalaxy).trim().toLowerCase();
    let currentPriorityTerm = (priorityTerm ?? selectedPriority).trim().toLowerCase();
    
    // Treat AGT as Alliance of Galactic Travellers
    if (currentCivTerm === 'agt') {
      currentCivTerm = 'alliance of galactic travellers';
    }

    // Column B (Galaxy) is at index 1, Column C (Civilization) is at index 2
    const galaxyFieldName = sourceCols[1]?.name;
    const civFieldName = sourceCols[2]?.name;
    
    if (!civFieldName || !galaxyFieldName) {
      setMatchedRecords([]);
      setClassifiedOmittedCount(0);
      setError('Required matching fields not found.');
      return;
    }

    const matches = sourceData.filter(row => {
      // IF the user types ALL or leaves blank then this field will match on anything including blank contents in the civilization field
      const civMatch = currentCivTerm === 'all' || !currentCivTerm || 
                      String(row[civFieldName] || '').toLowerCase().includes(currentCivTerm);
      // IF the user types ALL or leaves blank then this field will match on anything including blank contents in the galaxy field
      const galMatch = currentGalTerm === 'all' || !currentGalTerm ||
                      String(row[galaxyFieldName] || '').toLowerCase().includes(currentGalTerm);
      
      // Criteria filter for "Priority". Choices: "No", "Low", "Medium", "High". "None" (i.e. 'No') matches empty or "No"
      let priorityMatch = true;
      if (currentPriorityTerm && currentPriorityTerm !== 'all') {
        const rowVal = String(row._priority || '').trim().toLowerCase();
        if (currentPriorityTerm === 'no') {
          priorityMatch = rowVal === '' || rowVal === 'no' || rowVal === 'none' || rowVal === 'false';
        } else {
          priorityMatch = rowVal === currentPriorityTerm;
        }
      }

      return civMatch && galMatch && priorityMatch;
    });

    const hasCookieCreds = !!(activeTravellerName && activeTravellerId);
    const userSecLevel = hasCookieCreds ? activeSecurityLevel : 0;

    // Filter matches based on security level, Omit Public Records, & Omit Private Records preference
    let omittedCount = 0;
    const authorizedAndOmitChecked = matches.filter(record => {
      const lvl = getSecurityLevel(record._securityClass);
      if (lvl > userSecLevel) {
        omittedCount++;
        return false;
      }
      
      // Omit Private Records filter: if credentials exist and "Omit Private Records" is checked, we only display level === 0 records (i.e. lvl > 0 are omitted)
      if (hasCookieCreds && omitPrivateRecords) {
        if (lvl > 0) {
          omittedCount++;
          return false;
        }
      }
      
      // Omit Public Records filter: if credentials exist and "Omit Public Records" is checked, we only display level > 0 records
      if (hasCookieCreds && omitPublicRecords) {
        return lvl > 0;
      }
      
      return true;
    });

    setClassifiedOmittedCount(omittedCount);

    // Sort by Column B (Galaxy) then Column A (Region Name)
    const nameFieldName = sourceCols[0]?.name;
    const sortedMatches = [...authorizedAndOmitChecked].sort((a, b) => {
      const galA = String(a[galaxyFieldName] || '').toLowerCase();
      const galB = String(b[galaxyFieldName] || '').toLowerCase();
      
      if (galA !== galB) return galA.localeCompare(galB);
      
      const nameA = String(a[nameFieldName] || '').toLowerCase();
      const nameB = String(b[nameFieldName] || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    if (sortedMatches.length > 0) {
      setMatchedRecords(sortedMatches);
      setError(null);
    } else {
      setMatchedRecords([]);
      setError(`No records found for the selected criteria.`);
    }
  };

  const downloadFullReportPdf = async () => {
    // Check authorization first!
    const nameCookie = getCookie('travellerName');
    const idCookie = getCookie('travellerId');
    const preFilledName = settingsTravellerName.trim();
    const preFilledId = settingsTravellerId.trim();

    const cookieOk = !!(nameCookie && idCookie);
    const preFilledOk = !!(preFilledName && preFilledId);

    if (!cookieOk && !preFilledOk) {
      setPopupMsg("PDF Report and Export CSV is only available to registered AGT Travellers. Enter your credientials in the setting menu");
      return;
    }

    let userSecLvl = 0;
    if (cookieOk) {
      const lvl = parseInt(getCookie('securityLevel') || '', 10);
      userSecLvl = isNaN(lvl) ? 0 : lvl;
    } else if (preFilledOk) {
      setLoading(true);
      const result = await verifyTravellerCredentials(preFilledName, preFilledId);
      setLoading(false);
      if (result.success) {
        userSecLvl = result.securityLevel ?? 0;
        // Save to cookie since credentials matched successfully
        document.cookie = `travellerName=${encodeURIComponent(preFilledName)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `travellerId=${encodeURIComponent(preFilledId)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `securityLevel=${encodeURIComponent(String(userSecLvl))}; path=/; max-age=31536000; SameSite=Lax`;
        setActiveTravellerName(preFilledName);
        setActiveTravellerId(preFilledId);
        setActiveSecurityLevel(userSecLvl);
      } else {
        setPopupMsg(
          <div className="space-y-3">
            <div className="text-sm font-bold text-red-500">Verification unsuccessful for pre-filled credentials. Export aborted.</div>
            <div className="text-xs text-[#FFB451]/80 leading-relaxed font-sans mt-1">
              Traveller Name and ID and does not match, Please consult{" "}
              <a 
                href="https://www.nms-agt.com/support/traveller-id" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-white hover:text-[#FFB451] font-bold"
              >
                AGT Support
              </a>
            </div>
          </div>
        );
        return;
      }
    }

    // Filter matchedRecords by security classification
    const recordsToBuild = matchedRecords.filter(record => {
      const recLvl = getSecurityLevel(record._securityClass);
      return recLvl <= userSecLvl;
    });

    if (recordsToBuild.length === 0) {
      setPopupMsg("No records match your security clearance for PDF Report.");
      return;
    }

    if (reportType === 'Custom') {
      const getRequiredColWidth = (colIdx: number): number => {
        if (colIdx === 0) return 33; // Region Name
        if (colIdx === 1) return 18; // Galaxy (B) - auto adjusted narrower
        if (colIdx === 2) return 22; // Civilized (C)
        if (colIdx === 3) return 31; // Coordinates (D)
        if (colIdx === 4) return 14; // Quadrant (E)
        if (colIdx === 9) return 14; // Game Release (J)
        if (colIdx === 10) return 12; // Earliest Surveyor (K) - auto adjusted narrower
        if (colIdx === 11) return 12; // Latest Surveyor (L) - auto adjusted narrower
        if (colIdx === 12) return 12; // Latest Survey (M) - auto adjusted narrower
        if (colIdx === 13) return 26; // Summary Notes (N)
        if (colIdx === 14) return 26; // Location Notes (O)
        if (colIdx === 15) return 26; // Additional Notes (P)
        if (colIdx === 16) return 26; // Civilized Notes (Q)
        if (colIdx === 18) return 9;  // Region Age (S) - never more than 4 chars
        if (colIdx === 19) return 8;  // Lowest Known Phantom System (T) - never more than 3 chars
        if (colIdx === 20) return 10; // Wiki Link (U)
        if (colIdx === 21) return 10; // External Link (V)
        if (colIdx === 22) return 10; // Video Link (W)
        if (colIdx === 23) return 10; // Light Year Estimate (X) - never more than 9 chars
        if (colIdx === 31) return 22; // Legacy Name (AF)
        if (colIdx === 32) return 10; // Legacy Wiki Link (AG)
        return 14; // default safety width
      };

      const enabledCols = columns.filter(col => col.enabled);
      let totalWidth = 0;
      enabledCols.forEach(col => {
        totalWidth += getRequiredColWidth(col.colIndex ?? -1);
      });

      if (totalWidth > 257) {
        setPdfErrorMsg("Too many columns, reduce columns or use Export CSV");
        return; // Abort the PDF Report process
      }
    }

    setIsGeneratingFile(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape layout (297mm x 210mm)
    const galaxyFilterVal = selectedGalaxy || 'All';
    let civFilterVal = searchKey || 'All';
    if (String(civFilterVal).trim().toUpperCase() === 'AGT') {
      civFilterVal = 'Alliance of Galactic Travellers';
    }
    
    const formatDateToDDMMMYYYY = (dateObj: Date): string => {
      const d = String(dateObj.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = months[dateObj.getMonth()];
      const y = dateObj.getFullYear();
      return `${d}-${m}-${y}`;
    };

    const formatMilitaryTime = (dateObj: Date): string => {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    };

    const now = new Date();
    const formattedDate = formatDateToDDMMMYYYY(now);

    const getBase64Image = (url: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
              return;
            }
          } catch (e) {
            console.error("Canvas export failed for " + url, e);
          }
          resolve(null);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    let logoBase64 = await getBase64Image("/AgtOfficialLogo.png");
    if (!logoBase64) {
      // Fallback to AGTIcon.png if official logo is missing
      logoBase64 = await getBase64Image("/AGTIcon.png");
    }
    const iconBase64 = await getBase64Image("/AGTIcon.png");

    // COVER PAGE SETUP
    // 20% from the top of the cover page (210mm total height -> 20% works out to exactly 42mm center point)
    let maxLvl = 0;
    recordsToBuild.forEach(record => {
      const lvl = getSecurityLevel(record._securityClass);
      if (lvl > maxLvl) maxLvl = lvl;
    });

    const levelNames: { [key: number]: string } = {
      1: "Private",
      2: "Restricted",
      3: "Top Secret",
      4: "SLT Restricted",
      5: "SCC Restricted"
    };

    if (maxLvl > 0) {
      const levelWord = levelNames[maxLvl] || '';
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 5, 0);
      doc.text(`This report contains ${levelWord} Intelligence`, 148.5, 26, { align: "center" });
    }

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 130.5, 36, 36, 36);
    } else {
      // Elegant design shape placeholder
      doc.setFillColor(255, 5, 0); // FF0500 
      doc.rect(130.5, 36, 36, 36, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("AGT", 148.5, 56, { align: "center" });
    }

    // Title: "AGT Region Report"
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(255, 5, 0); // FF0500 Accent
    doc.text("AGT Region Report", 148.5, 95, { align: "center" });

    // Details block below title
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Galaxy Filter: ${galaxyFilterVal}`, 148.5, 115, { align: "center" });
    doc.text(`Civilization Filter: ${civFilterVal}`, 148.5, 125, { align: "center" });
    doc.text(`Report Date: ${formattedDate}`, 148.5, 135, { align: "center" });

    // Outer border frame for stylish presentation
    doc.setDrawColor(255, 5, 0); // FF0500 Accent
    doc.setLineWidth(1);
    doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.3);
    doc.rect(12, 12, 273, 186);

    // Records page moves to the next page, which will count as Page 1
    doc.addPage();

    // Dynamically adjust font size based on the number of non-zero active columns
    const enabledCols = columns.filter(col => col.enabled);
    const numCols = enabledCols.length;
    let baseFontSize = 8;
    if (numCols > 16) {
      baseFontSize = 5.5;
    } else if (numCols > 12) {
      baseFontSize = 6.5;
    } else if (numCols > 8) {
      baseFontSize = 7.5;
    }

    const truncateToThreeLinesInPDF = (text: string, colWidth: number, docInstance: jsPDF): string => {
      if (!text || text.trim() === '') return '-';
      const lines = docInstance.splitTextToSize(text, colWidth);
      if (lines.length > 3) {
        const truncatedLines = lines.slice(0, 3);
        let lastLine = truncatedLines[2] || '';
        if (lastLine.length > 3) {
          lastLine = lastLine.substring(0, lastLine.length - 3) + '...';
        } else {
          lastLine = lastLine + '...';
        }
        truncatedLines[2] = lastLine;
        return truncatedLines.join('\n');
      }
      return lines.join('\n');
    };

    const tableHeaders = columns.filter(col => col.enabled).map(col => col.name);
    const tableData = recordsToBuild.map(record => 
      columns.filter(col => col.enabled).map(col => {
        const val = record[col.name];
        if (col.colIndex === 20 || col.colIndex === 21 || col.colIndex === 22 || col.colIndex === 32) {
          const isValid = typeof val === 'string' && val.trim().length > 0;
          return isValid ? 'LINK' : '-';
        }
        if (col.colIndex === 13 || col.colIndex === 14 || col.colIndex === 15 || col.colIndex === 16) {
          if (typeof val === 'string' && val.trim().length > 0) {
            return truncateToThreeLinesInPDF(val, 24, doc);
          }
        }
        return record[col.name] || '-';
      })
    );

    // Add total row to PDF
    const totalFieldName = columns[4]?.name || 'Points';
    const totalRow = columns.filter(col => col.enabled).map(col => {
      if (col.name === totalFieldName) return `TOTAL: ${recordsToBuild.length}`;
      if (col.name === columns[0]?.name) return 'Number of Regions';
      return '';
    });
    tableData.push(totalRow);

    const colStyles: { [key: number]: any } = {};
    columns.filter(col => col.enabled).forEach((col, idx) => {
      const colIdx = col.colIndex ?? -1;
      if (colIdx === 20 || colIdx === 21 || colIdx === 22 || colIdx === 32) {
        // Narrow fixed size for "LINK" columns (U, V, W, AG)
        colStyles[idx] = { cellWidth: 10, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 3) {
        // Coordinates: perfectly 31mm width, no wrapping, minimal padding to prevent linesplit/truncation
        colStyles[idx] = { cellWidth: 31, noWrap: true, cellPadding: { left: 0.5, right: 0.5, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 0) {
        // Region name: standard wrap width up to two lines
        colStyles[idx] = { cellWidth: 33, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 13 || colIdx === 14 || colIdx === 15 || colIdx === 16) {
        // Notes columns (N, O, P, Q) pre-truncated
        colStyles[idx] = { cellWidth: 26, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 1) {
        // Galaxy (B) - auto adjusted narrower
        colStyles[idx] = { cellWidth: 18, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 10) {
        // Earliest Surveyor (K) - auto adjusted narrower
        colStyles[idx] = { cellWidth: 12, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 11) {
        // Latest Surveyor (L) - auto adjusted narrower
        colStyles[idx] = { cellWidth: 12, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 12) {
        // Latest Survey (M) - auto adjusted narrower
        colStyles[idx] = { cellWidth: 12, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 18) {
        // Region Age (S) - max 4 chars (approx 9mm width)
        colStyles[idx] = { cellWidth: 9, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 19) {
        // Lowest Known Phantom System (T) - max 3 chars (approx 8mm width)
        colStyles[idx] = { cellWidth: 8, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (colIdx === 23) {
        // Light Year Estimate (X) - max 9 chars (approx 10mm width)
        colStyles[idx] = { cellWidth: 10, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
      } else if (reportType === 'Custom') {
        if (colIdx === 2 || colIdx === 31) {
          colStyles[idx] = { cellWidth: 22, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
        } else {
          colStyles[idx] = { cellWidth: 14, cellPadding: { left: 1, right: 1, top: 1.5, bottom: 1.5 } };
        }
      } else if (numCols > 12) {
        if (colIdx === 2 || colIdx === 31) {
          colStyles[idx] = { cellWidth: 22 };
        } else {
          colStyles[idx] = { cellWidth: 14 };
        }
      }
    });

    autoTable(doc, {
      startY: 28, // start table below repeating header boundary at Y=22
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [42, 42, 42], textColor: [255, 255, 255], fontSize: baseFontSize, fontStyle: 'bold' },
      bodyStyles: { fontSize: baseFontSize, textColor: [30, 30, 30] },
      columnStyles: colStyles,
      margin: { top: 30, left: 20, right: 20 },
      didDrawPage: (data) => {
        // Draw recurring header on every records page
        const logoX = 20;
        const logoY = 10;
        const logoSize = 10;
        
        if (iconBase64) {
          doc.addImage(iconBase64, 'PNG', logoX, logoY, logoSize, logoSize);
        } else {
          doc.setFillColor(255, 5, 0);
          doc.rect(logoX, logoY, logoSize, logoSize, "F");
        }
        
        doc.setFontSize(10);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(0, 0, 0); // Black text for header line
        doc.text(`AGT Region Report - Galaxy: ${galaxyFilterVal} / Civ: ${civFilterVal}`, logoX + 13, logoY + 6);
        
        // Page number to the right side of the header (starts on Page 1)
        doc.setFontSize(8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(0, 0, 0); // Black text for page numbers
        doc.text(`Page ${data.pageNumber}`, 277, logoY + 6, { align: "right" });

        doc.setDrawColor(255, 5, 0);
        doc.setLineWidth(0.5);
        doc.line(logoX, logoY + logoSize + 2, 277, logoY + logoSize + 2);
        
        // Dynamic Footer starting on Page 1
        if (data.pageNumber >= 1) {
          doc.setFontSize(8);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(0, 0, 0); // Black text for footer line
          const footerDateStr = formatDateToDDMMMYYYY(now);
          const militaryTimeStr = formatMilitaryTime(now);
          doc.text(`Report Created on: ${footerDateStr} ${militaryTimeStr}`, 20, 203, { align: "left" });
        }
      },
      didParseCell: (data) => {
        // Highlight total row at bottom
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [245, 245, 245];
          data.cell.styles.textColor = [255, 5, 0];
          data.cell.styles.fontStyle = 'bold';
        } else {
          const enabledCols = columns.filter(col => col.enabled);
          const colInfo = enabledCols[data.column.index];
          if (colInfo && (colInfo.colIndex === 20 || colInfo.colIndex === 21 || colInfo.colIndex === 22 || colInfo.colIndex === 32)) {
            if (data.cell.text && data.cell.text[0] === 'LINK') {
              data.cell.styles.textColor = [0, 85, 204]; // Blue color for hyperlink
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.row.index < tableData.length - 1) {
          const enabledCols = columns.filter(col => col.enabled);
          const colInfo = enabledCols[data.column.index];
          if (colInfo && (colInfo.colIndex === 20 || colInfo.colIndex === 21 || colInfo.colIndex === 22 || colInfo.colIndex === 32)) {
            const record = matchedRecords[data.row.index];
            if (record) {
              const rawVal = record[colInfo.name];
              if (rawVal && typeof rawVal === 'string' && rawVal.trim().length > 0) {
                const url = rawVal.match(/^https?:\/\//i) ? rawVal.trim() : `https://${rawVal.trim()}`;
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
              }
            }
          }
        }
      }
    });

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

    doc.save(`AGT_Region_Report_${timestamp}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingFile(false);
    }
  };

  const downloadFullReportCsv = async () => {
    // Check authorization first!
    const nameCookie = getCookie('travellerName');
    const idCookie = getCookie('travellerId');
    const preFilledName = settingsTravellerName.trim();
    const preFilledId = settingsTravellerId.trim();

    const cookieOk = !!(nameCookie && idCookie);
    const preFilledOk = !!(preFilledName && preFilledId);

    if (!cookieOk && !preFilledOk) {
      setPopupMsg("PDF Report and Export CSV is only available to registered AGT Travellers. Enter your credientials in the setting menu");
      return;
    }

    let userSecLvl = 0;
    if (cookieOk) {
      const lvl = parseInt(getCookie('securityLevel') || '', 10);
      userSecLvl = isNaN(lvl) ? 0 : lvl;
    } else if (preFilledOk) {
      setLoading(true);
      const result = await verifyTravellerCredentials(preFilledName, preFilledId);
      setLoading(false);
      if (result.success) {
        userSecLvl = result.securityLevel ?? 0;
        // Save to cookie since credentials matched successfully
        document.cookie = `travellerName=${encodeURIComponent(preFilledName)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `travellerId=${encodeURIComponent(preFilledId)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `securityLevel=${encodeURIComponent(String(userSecLvl))}; path=/; max-age=31536000; SameSite=Lax`;
        setActiveTravellerName(preFilledName);
        setActiveTravellerId(preFilledId);
        setActiveSecurityLevel(userSecLvl);
      } else {
        setPopupMsg(
          <div className="space-y-3">
            <div className="text-sm font-bold text-red-500">Verification unsuccessful for pre-filled credentials. Export aborted.</div>
            <div className="text-xs text-[#FFB451]/80 leading-relaxed font-sans mt-1">
              Traveller Name and ID and does not match, Please consult{" "}
              <a 
                href="https://www.nms-agt.com/support/traveller-id" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-white hover:text-[#FFB451] font-bold"
              >
                AGT Support
              </a>
            </div>
          </div>
        );
        return;
      }
    }

    // Filter matchedRecords by security classification
    const recordsToBuild = matchedRecords.filter(record => {
      const recLvl = getSecurityLevel(record._securityClass);
      return recLvl <= userSecLvl;
    });

    if (recordsToBuild.length === 0) {
      setPopupMsg("No records match your security clearance for CSV Export.");
      return;
    }

    setIsGeneratingFile(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const displayHeaders = columns.filter(col => col.enabled).map(col => col.name);
      const rows = recordsToBuild.map(record =>
        columns.filter(col => col.enabled).map(col => record[col.name] || '')
      );

      const totalFieldName = columns[4]?.name || 'Points';
      const totalRow = columns.filter(col => col.enabled).map(col => {
        if (col.name === totalFieldName) return `TOTAL: ${recordsToBuild.length}`;
        if (col.name === columns[0]?.name) return 'Number of Regions';
        return '';
      });
      rows.push(totalRow);

      const csvContent = Papa.unparse({
        fields: displayHeaders,
        data: rows
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}-${month}-${day} ${hours}_${minutes}_${seconds}`;

      link.setAttribute('href', url);
      link.setAttribute('download', `AGT Region Report ${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingFile(false);
    }
  };

  const toggleColumn = (name: string) => {
    setColumns(prev => prev.map(c => c.name === name ? { ...c, enabled: !c.enabled } : c));
  };

  const activeColumnsCount = useMemo(() => columns.filter(c => c.enabled).length, [columns]);

  const totalPoints = useMemo(() => {
    return matchedRecords.length;
  }, [matchedRecords]);

  return (
    <div 
      onMouseDown={handleManualPlay}
      onTouchStart={handleManualPlay}
      className="min-h-screen bg-[#0a0a0a] text-agt-orange font-sans selection:bg-agt-orange selection:text-black"
    >
      <style>{`
        @media (min-width: 768px) {
          html {
            font-size: ${16 * parseFloat(textScale)}px !important;
          }
        }
      `}</style>
      {/* Header */}
      <header className="border-b border-agt-orange/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/AGTIcon.png" 
              alt="AGT Logo" 
              className="w-10 h-10 object-contain opacity-90"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                if (!img.parentElement?.querySelector('.agt-fallback')) {
                  img.parentElement?.insertAdjacentHTML('afterbegin', '<div class="agt-fallback w-10 h-10 bg-[#FFB451] rounded-sm flex items-center justify-center shrink-0"><span class="text-black font-bold text-[10px] tracking-tighter">AGT</span></div>');
                }
              }}
            />
            <div className="flex flex-col">
              <h1 className="font-bold text-xs tracking-[0.2em] uppercase text-[#FFB451]">{t("Alliance of Galactic Travellers")}</h1>
              <span className="text-[9px] text-[#FFB451] uppercase tracking-[0.3em] font-bold">{t("AGT Region Report Tool")}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {cacheTimestamp && !loading ? (
              <div className="hidden md:flex flex-col items-end text-right font-mono text-[9px] text-[#FFB451] tracking-widest">
                <div>
                  {t("STATUS:")} <span className="text-blue-500 font-bold">{t("Cached")}</span>
                </div>
                {(() => {
                  const formatted = formatCacheTimestamp(cacheTimestamp);
                  return formatted ? (
                    <div className="text-[8px] text-blue-400 font-bold tracking-wider mt-0.5 uppercase">
                      {formatted.dateStr} {formatted.timeStr}
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="hidden md:block text-[9px] text-[#FFB451] tracking-widest font-mono">
                {t("STATUS:")} <span className={
                  loading ? 'text-yellow-500' :
                  sheetUrl ? 'text-emerald-500' : 
                  'text-red-500'
                }>
                  {loading ? t('SYNCING') : sheetUrl ? t('CONNECTED') : t('DISCONNECTED')}
                </span>
              </div>
            )}
            {/* Pulsing dot when status text is not displayed */}
            <div className="md:hidden flex items-center justify-center w-4 h-4 relative">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping absolute shrink-0 ${
                loading ? 'bg-yellow-500' :
                cacheTimestamp ? 'bg-blue-500' :
                sheetUrl ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              <span className={`w-2.5 h-2.5 rounded-full relative shrink-0 ${
                loading ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.7)]' : 
                cacheTimestamp ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]' :
                sheetUrl ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 
                'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
              }`} />
            </div>
            
            {activeTravellerName && activeTravellerId ? (
              <div className={`border px-3 py-1 rounded-xl text-[11px] font-mono font-bold tracking-wider ${getSecurityLevelColor(activeSecurityLevel)}`}>
                {activeTravellerName.substring(0, 20)}
              </div>
            ) : (
              <div className={`border px-3 py-1 rounded-xl text-[11px] font-mono font-bold tracking-wider font-semibold ${getSecurityLevelColor(0)}`}>
                {t("Public User")}
              </div>
            )}

            <a 
              href="https://www.nms-agt.com/support"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center"
              title="Support"
              id="support-bug-btn"
            >
              <Bug 
                className="w-5 h-5" 
                style={{ color: '#FF0500' }}
              />
            </a>

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-[#FF0500]/10 rounded-lg transition-colors relative group cursor-pointer"
              title="Settings"
              id="settings-btn"
            >
              <Settings 
                className="w-5 h-5 transition-transform duration-700 hover:rotate-360" 
                style={{ color: '#FF0550' }} 
              />
              {!sheetUrl && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#FF0500] rounded-full shadow-[0_0_5px_rgba(255,5,0,0.5)]"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 relative">
        {/* Contribute Button - Upper right corner, 50% smaller than PDF Report button */}
        <div className="absolute top-4 right-6 z-10">
          <a
            href="https://www.nms-agt.com/contribute"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[8px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_8px_rgba(255,5,0,0.25)] hover:shadow-[0_0_15px_rgba(255,5,0,0.45)]"
          >
            <span>{t("Contribute")}</span>
          </a>
        </div>

        <div className="flex flex-col gap-16">
          
          {/* Main Search Logic Container - centered aesthetic */}
          <div className="flex flex-col items-center space-y-12">
            <div className="w-full max-w-xl text-center space-y-6">
              
              {/* Center aligned regions-icon.png before the title */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <img 
                  src={regionsIcon} 
                  alt="Regions Icon" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h2 className="text-4xl font-light tracking-tight text-[#FFB451]">{t("AGT Region Report Tool")}</h2>
              </div>
              
              {/* Report Format Toggle Switch */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 bg-[#161616] border-2 border-[#FF0500] rounded-full flex-wrap sm:flex-nowrap justify-center gap-1 sm:gap-0">
                  <button
                    onClick={() => setReportType('Simple')}
                    className={`px-5 py-2 text-[10px] uppercase font-black tracking-widest rounded-full transition-all cursor-pointer ${
                      reportType === 'Simple'
                        ? 'bg-[#FF0500] text-white shadow-lg shadow-[#FF0500]/25'
                        : 'text-[#FFB451]/55 hover:text-[#FFB451]'
                    }`}
                  >
                    {t("Simple Report")}
                  </button>
                  <button
                    onClick={() => setReportType('Detailed')}
                    className={`px-5 py-2 text-[10px] uppercase font-black tracking-widest rounded-full transition-all cursor-pointer ${
                      reportType === 'Detailed'
                        ? 'bg-[#FF0500] text-white shadow-lg shadow-[#FF0500]/25'
                        : 'text-[#FFB451]/55 hover:text-[#FFB451]'
                    }`}
                  >
                    {t("Detailed Report")}
                  </button>
                  <button
                    onClick={() => setReportType('Custom')}
                    className={`px-5 py-2 text-[10px] uppercase font-black tracking-widest rounded-full transition-all cursor-pointer ${
                      reportType === 'Custom'
                        ? 'bg-[#FF0500] text-white shadow-lg shadow-[#FF0500]/25'
                        : 'text-[#FFB451]/55 hover:text-[#FFB451]'
                    }`}
                  >
                    {t("Custom Report")}
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Civilization Autocomplete Input with label over it */}
              <div className="flex flex-col space-y-2">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                  {t("Select Civilization")}
                </label>
                <div ref={civAutocompleteRef} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451] transition-colors z-10">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={searchKey}
                  placeholder={t("Type or select civilization...")}
                  onFocus={() => {
                    setIsCivDropdownOpen(true);
                    setActiveCivIndex(0);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchKey(val);
                    setIsCivDropdownOpen(true);
                    setActiveCivIndex(0);
                    if (data.length) {
                      findRecord(data, columns, val, selectedGalaxy);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!isCivDropdownOpen) {
                        setIsCivDropdownOpen(true);
                        setActiveCivIndex(0);
                      } else {
                        setActiveCivIndex((prev) => (prev + 1) % Math.max(1, filteredCivilizations.length));
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (isCivDropdownOpen) {
                        setActiveCivIndex((prev) => (prev - 1 + filteredCivilizations.length) % Math.max(1, filteredCivilizations.length));
                      }
                    } else if (e.key === 'Enter') {
                      if (isCivDropdownOpen && filteredCivilizations.length > 0) {
                        e.preventDefault();
                        const selected = filteredCivilizations[activeCivIndex];
                        if (selected) {
                          setSearchKey(selected);
                          setIsCivDropdownOpen(false);
                          if (data.length) {
                            findRecord(data, columns, selected, selectedGalaxy);
                          }
                        }
                      }
                    } else if (e.key === 'Escape') {
                      setIsCivDropdownOpen(false);
                    }
                  }}
                  className="block w-full pl-14 pr-12 py-5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_25px_rgba(255,5,0,0.25)] focus:shadow-[0_0_35px_rgba(255,5,0,0.55)] animate-glow"
                  id="civilization-autocomplete"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCivDropdownOpen((prev) => !prev);
                  }}
                  className="absolute right-4 inset-y-0 flex items-center text-[#FFB451] hover:text-[#FFB451]/80 focus:outline-none z-10"
                >
                  <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isCivDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                </button>

                <AnimatePresence>
                  {isCivDropdownOpen && filteredCivilizations.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1a1a1a] border-2 border-[#FF0500] rounded-2xl shadow-[0_10px_35px_rgba(255,5,0,0.45)] z-50 overflow-hidden divide-y divide-[#FF0500]/10 slim-scroll"
                    >
                      {filteredCivilizations.map((civ, idx) => {
                        const isActive = idx === activeCivIndex;
                        return (
                          <div
                            key={civ}
                            onClick={() => {
                              setSearchKey(civ);
                              setIsCivDropdownOpen(false);
                              if (data.length) {
                                findRecord(data, columns, civ, selectedGalaxy);
                              }
                            }}
                            onMouseEnter={() => {
                              setActiveCivIndex(idx);
                            }}
                            className={`px-6 py-3 cursor-pointer text-base font-mono transition-all flex items-center justify-between ${
                              isActive 
                                ? 'bg-[#FF0500]/20 text-white font-bold border-l-4 border-l-[#FF0500]' 
                                : 'text-[#FFB451] hover:text-[#FFB451]/80 hover:bg-[#FF0500]/5'
                            }`}
                          >
                            <span>{civ}</span>
                            {civ === 'All' && (
                              <span className="text-[10px] uppercase bg-[#FF0500]/20 text-white tracking-widest font-bold px-2 py-0.5 rounded">
                                {t("Show All")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Galaxy Dropdown/Search with label over it */}
            <div className="flex flex-col space-y-2">
              <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                {t("Preferred Galaxy")}
              </label>
              <div ref={autocompleteRef} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451] transition-colors z-10">
                  <Globe className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={selectedGalaxy}
                  placeholder={t("Type or select galaxy...")}
                  onFocus={() => {
                    setIsGalaxyDropdownOpen(true);
                    setActiveGalaxyIndex(0);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedGalaxy(val);
                    setIsGalaxyDropdownOpen(true);
                    setActiveGalaxyIndex(0);
                    if (data.length) {
                      findRecord(data, columns, searchKey, val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!isGalaxyDropdownOpen) {
                        setIsGalaxyDropdownOpen(true);
                        setActiveGalaxyIndex(0);
                      } else {
                        setActiveGalaxyIndex((prev) => (prev + 1) % Math.max(1, filteredGalaxies.length));
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (isGalaxyDropdownOpen) {
                        setActiveGalaxyIndex((prev) => (prev - 1 + filteredGalaxies.length) % Math.max(1, filteredGalaxies.length));
                      }
                    } else if (e.key === 'Enter') {
                      if (isGalaxyDropdownOpen && filteredGalaxies.length > 0) {
                        e.preventDefault();
                        const selected = filteredGalaxies[activeGalaxyIndex];
                        if (selected) {
                          setSelectedGalaxy(selected);
                          setIsGalaxyDropdownOpen(false);
                          if (data.length) {
                            findRecord(data, columns, searchKey, selected);
                          }
                        }
                      }
                    } else if (e.key === 'Escape') {
                      setIsGalaxyDropdownOpen(false);
                    }
                  }}
                  className="block w-full pl-14 pr-12 py-5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_25px_rgba(255,5,0,0.25)] focus:shadow-[0_0_35px_rgba(255,5,0,0.55)]"
                  id="galaxy-select"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGalaxyDropdownOpen((prev) => !prev);
                  }}
                  className="absolute right-4 inset-y-0 flex items-center text-[#FFB451] hover:text-[#FFB451]/80 focus:outline-none z-10"
                >
                  <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isGalaxyDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                </button>

                <AnimatePresence>
                  {isGalaxyDropdownOpen && filteredGalaxies.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1a1a1a] border-2 border-[#FF0500] rounded-2xl shadow-[0_10px_35px_rgba(255,5,0,0.45)] z-50 overflow-hidden divide-y divide-[#FF0500]/10 slim-scroll"
                    >
                      {filteredGalaxies.map((gal, idx) => {
                        const isActive = idx === activeGalaxyIndex;
                        return (
                          <div
                            key={gal}
                            onClick={() => {
                              setSelectedGalaxy(gal);
                              setIsGalaxyDropdownOpen(false);
                              if (data.length) {
                                  findRecord(data, columns, searchKey, gal);
                              }
                            }}
                            onMouseEnter={() => {
                              setActiveGalaxyIndex(idx);
                            }}
                            className={`px-6 py-3 cursor-pointer text-base font-mono transition-all flex items-center justify-between ${
                              isActive 
                                ? 'bg-[#FF0500]/20 text-white font-bold border-l-4 border-l-[#FF0500]' 
                                : 'text-[#FFB451] hover:text-[#FFB451]/80 hover:bg-[#FF0500]/5'
                            }`}
                          >
                            <span>{gal}</span>
                            {gal === 'All' && (
                              <span className="text-[10px] uppercase bg-[#FF0500]/20 text-white tracking-widest font-bold px-2 py-0.5 rounded">
                                {t("Show All")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Omit Public/Private Records selection boxes (visible only if there are credentials saved) */}
              {(activeTravellerName && activeTravellerId) && (
                <div className="flex flex-wrap items-center gap-6 mt-3 select-none">
                  <label className="flex items-center gap-2.5 cursor-pointer text-[#FFB451] hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={omitPublicRecords}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOmitPublicRecords(checked);
                        if (checked) {
                          setOmitPrivateRecords(false);
                        }
                      }}
                      className="w-4.5 h-4.5 rounded border-2 border-[#FF0500] bg-[#1a1a1a] text-[#FF0500] focus:ring-1 focus:ring-[#FF0500]/50 accent-[#FF0500] cursor-pointer"
                      id="omit-public"
                    />
                    <span className="text-xs font-mono tracking-wider uppercase font-bold text-[#FFB451] hover:text-white transition-colors">
                      {t("Omit Public Records")}
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-[#FFB451] hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={omitPrivateRecords}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOmitPrivateRecords(checked);
                        if (checked) {
                          setOmitPublicRecords(false);
                        }
                      }}
                      className="w-4.5 h-4.5 rounded border-2 border-[#FF0500] bg-[#1a1a1a] text-[#FF0500] focus:ring-1 focus:ring-[#FF0500]/50 accent-[#FF0500] cursor-pointer"
                      id="omit-private"
                    />
                    <span className="text-xs font-mono tracking-wider uppercase font-bold text-[#FFB451] hover:text-white transition-colors">
                      {t("Omit Private Records")}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Priority Dropdown/Select with label over it */}
            <div className="flex flex-col space-y-2">
              <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                {t("Priority")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-[#FFB451] z-10">
                  <Sliders className="h-5 w-5" />
                </div>
                <select
                  value={selectedPriority}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedPriority(val);
                    if (data.length) {
                      findRecord(data, columns, searchKey, selectedGalaxy, val);
                    }
                  }}
                  className="block w-full pl-14 pr-12 py-5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_25px_rgba(255,5,0,0.25)] focus:shadow-[0_0_35px_rgba(255,5,0,0.55)] appearance-none cursor-pointer"
                  id="priority-select"
                >
                  <option value="All" className="bg-[#1a1a1a] text-[#FFB451]">{t("All Priorities")}</option>
                  <option value="No" className="bg-[#1a1a1a] text-[#FFB451]">{t("Priority No")}</option>
                  <option value="Low" className="bg-[#1a1a1a] text-[#FFB451]">{t("Priority Low")}</option>
                  <option value="Medium" className="bg-[#1a1a1a] text-[#FFB451]">{t("Priority Medium")}</option>
                  <option value="High" className="bg-[#1a1a1a] text-[#FFB451]">{t("Priority High")}</option>
                </select>
                <div className="absolute right-6 inset-y-0 flex items-center pointer-events-none text-[#FFB451] z-10">
                  <ChevronDown className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-20 py-5 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-full font-black text-sm uppercase tracking-[0.2em] hover:bg-[#FF0500]/85 active:scale-[0.96] disabled:opacity-25 disabled:pointer-events-none shadow-[0_4px_15px_rgba(255,5,0,0.3)] hover:shadow-[0_0_25px_rgba(255,5,0,0.5)] transition-all flex items-center gap-2 cursor-pointer"
              id="fetch-btn"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 text-white" />
                  <span className="text-white">{t("Extract Reports")}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setSearchKey('');
                setSelectedGalaxy('');
                setSelectedPriority('All');
                if (data.length) {
                  findRecord(data, columns, '', '', 'All');
                }
              }}
              className="px-8 py-5 bg-[#161616] border-2 border-[#FF0500]/40 text-[#FFB451] hover:text-white hover:border-[#FF0500] rounded-full font-black text-xs uppercase tracking-[0.15em] hover:bg-[#FF0500]/15 active:scale-[0.96] transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
              id="reset-btn"
              title={t("Reset Fields")}
            >
              <RotateCcw className="w-4.5 h-4.5 text-[#FF0500]" />
              <span>{t("Reset Fields")}</span>
            </button>
          </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 px-6 py-3 bg-[#FFB451]/5 border border-[#FFB451]/20 text-[#FFB451] rounded-full text-xs font-medium tracking-wide"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </div>

          <div className="space-y-12">
            
          {/* PDF Error Modal Overlay - alert if column widths exceed limits */}
          <AnimatePresence>
            {pdfErrorMsg && (
              <div 
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 pointer-events-auto"
                onClick={() => setPdfErrorMsg(null)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="relative bg-[#0d0d0d] border-2 border-[#FF0500] rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-[#FF0500] flex items-center justify-center bg-[#FF0500]/10 text-[#FF0500]">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#FFB451]">{t("Limit Exceeded")}</h3>
                  <p className="text-xs text-[#FFB451]/80 leading-relaxed font-mono">
                    {pdfErrorMsg}
                  </p>
                  <div className="pt-4 w-full">
                    <button 
                      onClick={() => setPdfErrorMsg(null)}
                      className="w-full px-5 py-3 bg-[#FF0500] border-2 border-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.3)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                    >
                      {t("Close")}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* General/Authentication Popup Message Modal Overlay */}
          <AnimatePresence>
            {popupMsg && (
              <div 
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 pointer-events-auto"
                onClick={() => setPopupMsg(null)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="relative bg-[#0d0d0d] border-2 border-[#FF0500] rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-[#FF0500] flex items-center justify-center bg-[#FF0500]/10 text-[#FF0500]">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#FFB451]">{t("System Alert")}</h3>
                  <div className="text-xs text-[#FFB451]/80 leading-relaxed font-mono">
                    {popupMsg}
                  </div>
                  <div className="pt-2 w-full">
                    <button 
                      onClick={() => setPopupMsg(null)}
                      className="w-full px-5 py-3 bg-[#FF0500] border-2 border-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.3)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                    >
                      {t("Close")}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Settings Overlay - Pop Up Box on top of the main display */}
          <AnimatePresence>
            {showSettings && (
              <div 
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4 pointer-events-auto"
                onClick={() => setShowSettings(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="relative bg-[#0d0d0d] border-2 border-[#FF0500] rounded-2xl max-w-2xl w-full p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button inside modal header */}
                  <div className="flex justify-between items-center pb-4 border-b border-[#FF0500]/20 mb-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#FFB451] flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#FF0550] animate-spin" style={{ color: '#FF0550' }} />
                      Control Settings
                    </h3>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="px-5 py-2.5 bg-[#FF0500] border-2 border-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.3)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Display Settings Section */}
                    <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                        <Sliders className="w-3 h-3 text-[#FFB451]" />
                        {t("Display Settings")}
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">{t("Max Records on screen")}</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value={15} className="bg-[#161616] text-[#FFB451]">{t("15 Records")}</option>
                            <option value={30} className="bg-[#161616] text-[#FFB451]">{t("30 Records")}</option>
                            <option value={50} className="bg-[#161616] text-[#FFB451]">{t("50 Records")}</option>
                            <option value={100} className="bg-[#161616] text-[#FFB451]">{t("100 Records")}</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">{t("Text Scaling (Desktop Mode)")}</span>
                          <select
                            value={textScale}
                            onChange={(e) => {
                              setTextScale(e.target.value);
                              localStorage.setItem('agt_text_scale', e.target.value);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value="1" className="bg-[#161616] text-[#FFB451]">{t("1x (Default)")}</option>
                            <option value="1.5" className="bg-[#161616] text-[#FFB451]">{t("1.5x")}</option>
                            <option value="2" className="bg-[#161616] text-[#FFB451]">{t("2x")}</option>
                            <option value="2.5" className="bg-[#161616] text-[#FFB451]">{t("2.5x")}</option>
                            <option value="3" className="bg-[#161616] text-[#FFB451]">{t("3x")}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Language Settings Section */}
                    <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                        <Globe className="w-3 h-3 text-[#FFB451]" />
                        {t("Select Language")}
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">{t("Select Language")}</span>
                          <select
                            value={language}
                            onChange={(e) => {
                              const newLang = e.target.value as any;
                              setLanguage(newLang);
                              localStorage.setItem('agt_language', newLang);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value="en" className="bg-[#161616] text-[#FFB451]">English (EN)</option>
                            <option value="fr" className="bg-[#161616] text-[#FFB451]">Français (FR)</option>
                            <option value="es" className="bg-[#161616] text-[#FFB451]">Español (ES)</option>
                            <option value="de" className="bg-[#161616] text-[#FFB451]">Deutsch (DE)</option>
                            <option value="pt" className="bg-[#161616] text-[#FFB451]">Português (PT)</option>
                            <option value="it" className="bg-[#161616] text-[#FFB451]">Italiano (IT)</option>
                            <option value="th" className="bg-[#161616] text-[#FFB451]">ไทย (TH)</option>
                            <option value="hi" className="bg-[#161616] text-[#FFB451]">हिन्दी (HI)</option>
                            <option value="ja" className="bg-[#161616] text-[#FFB451]">日本語 (JA)</option>
                            <option value="zh" className="bg-[#161616] text-[#FFB451]">中文 (ZH)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Custom Report Columns Section */}
                    <div className="col-span-1 md:col-span-2 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30 relative overflow-hidden transition-all duration-300">
                      <div 
                        onClick={() => setCustomColumnsExpanded(!customColumnsExpanded)}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                      >
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2 group-hover:text-white transition-colors">
                          <Sliders className="w-3 h-3 text-[#FFB451] group-hover:text-white transition-colors" />
                          {t("Custom Report Columns")}
                        </h3>
                        <div className="flex items-center gap-2 text-[#FFB451]/60 group-hover:text-white transition-colors">
                          <span className="text-[8px] font-mono tracking-wider uppercase font-bold">
                            {customColumnsExpanded ? t("Collapse") : t("Expand")}
                          </span>
                          <motion.span
                            animate={{ rotate: customColumnsExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.span>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {customColumnsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-4 overflow-hidden"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pb-2 border-b border-white/5">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updated: { [key: number]: boolean } = {};
                                    AVAILABLE_CUSTOM_TOGGLES.forEach(t => {
                                      updated[t.idx] = true;
                                    });
                                    setCustomReportToggles(updated);
                                  }}
                                  className="px-2.5 py-1.5 border border-[#FF0500] bg-[#FF0500]/10 hover:bg-[#FF0500]/20 text-[#FFB451] hover:text-white rounded text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                                >
                                  {t("Select All")}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updated: { [key: number]: boolean } = {};
                                    AVAILABLE_CUSTOM_TOGGLES.forEach(t => {
                                      updated[t.idx] = false;
                                    });
                                    setCustomReportToggles(updated);
                                  }}
                                  className="px-2.5 py-1.5 border border-[#FFB451]/20 bg-transparent hover:bg-white/[0.05] text-[#FFB451]/70 hover:text-white rounded text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                                >
                                  {t("Unselect All")}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-left">
                              {AVAILABLE_CUSTOM_TOGGLES.map((toggle) => {
                                const isActive = !!customReportToggles[toggle.idx];
                                return (
                                  <button
                                    key={toggle.idx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomReportToggles(prev => ({
                                        ...prev,
                                        [toggle.idx]: !prev[toggle.idx]
                                      }));
                                    }}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-[10px] font-mono font-bold tracking-tight text-left cursor-pointer transition-all ${
                                      isActive 
                                        ? 'bg-[#FF0500]/15 border-[#FF0500] text-white shadow-sm'
                                        : 'bg-transparent border-[#FFB451]/10 text-[#FFB451]/40 hover:border-[#FFB451]/20'
                                    }`}
                                  >
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-[#FF0500] animate-pulse shadow-[0_0_5px_#FF0500]' : 'bg-[#FFB451]/30'}`}></span>
                                    <span>{toggle.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Traveller Registration Section */}
                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-white/5 space-y-4">
                      <div className="border-2 border-[#FF0500] p-5 rounded-xl bg-black/30 col-span-1 md:col-span-2 space-y-5">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#FFB451]" />
                          {t("AGT Traveller Registration")}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Traveller Name */}
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider text-[#FFB451]/60 font-mono font-bold">
                              {t("Traveller Name")}
                            </label>
                            <input
                              type="text"
                              value={settingsTravellerName}
                              maxLength={42}
                              onChange={(e) => {
                                setSettingsTravellerName(e.target.value.substring(0, 42));
                              }}
                              placeholder={t("Enter Traveller Name...")}
                              className="w-full px-4 py-3 bg-[#0d0d0d] border border-[#FFB451]/20 rounded-xl text-xs font-mono text-white placeholder-[#FFB451]/30 focus:border-[#FF0500]/50 focus:ring-1 focus:ring-[#FF0500]/50 focus:outline-none transition-all"
                            />
                          </div>

                          {/* Traveller ID */}
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider text-[#FFB451]/60 font-mono font-bold">
                              {t("AGT Traveller ID")}
                            </label>
                            <input
                              type="text"
                              value={settingsTravellerId}
                              maxLength={18}
                              onChange={(e) => {
                                let val = e.target.value.toUpperCase();
                                val = val.replace(/[^A-Z0-9?-]/g, '');
                                setSettingsTravellerId(val);
                                setVerifyValidationError(null);
                              }}
                              placeholder="37120130-????-1234"
                              className="w-full px-4 py-3 bg-[#0d0d0d] border border-[#FFB451]/20 rounded-xl text-xs font-mono text-white placeholder-[#FFB451]/30 focus:border-[#FF0500]/50 focus:ring-1 focus:ring-[#FF0500]/50 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        {verifyValidationError && (
                          <div className="text-[10px] text-red-500 font-mono flex items-center gap-1.5 bg-red-950/20 p-2.5 rounded-lg border border-red-500/10">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{verifyValidationError}</span>
                          </div>
                        )}

                        {/* Control buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          {/* Save & Verify */}
                          <button
                            type="button"
                            disabled={verifyLoading}
                            onClick={async () => {
                              const cleanName = settingsTravellerName.trim();
                              const cleanId = settingsTravellerId.trim();
                              
                              if (!cleanName || !cleanId) {
                                setVerifyValidationError("Both Traveller Name and ID are required.");
                                return;
                              }

                              const idPattern = /^[0-9]{8}-[0-9A-Z?]{4}-[0-9]{4}$/;
                              if (!idPattern.test(cleanId)) {
                                setVerifyValidationError("AGT Traveller ID must match format: ########-????-#### (e.g., 37120130-????-1234)");
                                return;
                              }

                              setVerifyValidationError(null);
                              setVerifyLoading(true);
                              try {
                                const result = await verifyTravellerCredentials(cleanName, cleanId);
                                if (result.success) {
                                  const secLvl = result.securityLevel ?? 0;
                                  
                                  // Set cookies
                                  document.cookie = `travellerName=${encodeURIComponent(cleanName)}; path=/; max-age=31536000; SameSite=Lax`;
                                  document.cookie = `travellerId=${encodeURIComponent(cleanId)}; path=/; max-age=31536000; SameSite=Lax`;
                                  document.cookie = `securityLevel=${encodeURIComponent(String(secLvl))}; path=/; max-age=31536000; SameSite=Lax`;
                                  
                                  // Update state
                                  setActiveTravellerName(cleanName);
                                  setActiveTravellerId(cleanId);
                                  setActiveSecurityLevel(secLvl);
                                  
                                  // Verify cookie was created properly
                                  const savedName = getCookie('travellerName');
                                  const savedId = getCookie('travellerId');
                                  
                                  if (savedName === cleanName && savedId === cleanId) {
                                    setPopupMsg("Verification successful, setting saved");
                                  } else {
                                    setPopupMsg("Verification successful, setting save error");
                                  }
                                } else {
                                  // Display the error message with support link
                                  setPopupMsg(
                                    <div className="space-y-3">
                                      <div className="text-sm font-bold text-red-500">Verification unsuccessful</div>
                                      <div className="text-xs text-[#FFB451]/80 leading-relaxed font-sans mt-1">
                                        Traveller Name and ID and does not match, Please consult{" "}
                                        <a 
                                          href="https://www.nms-agt.com/support/traveller-id" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="underline text-white hover:text-[#FFB451] font-bold animate-pulse"
                                        >
                                          AGT Support
                                        </a>
                                      </div>
                                    </div>
                                  );
                                }
                              } catch (err) {
                                setPopupMsg("Verification unsuccessful");
                              } finally {
                                setVerifyLoading(false);
                              }
                            }}
                            className="w-full py-3 bg-[#FF0500] hover:bg-[#FF0500]/85 border-2 border-[#FF0500] text-white disabled:opacity-50 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] flex items-center justify-center gap-2"
                          >
                            {verifyLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : null}
                            <span>{verifyLoading ? t("Verifying...") : t("Save & Verify")}</span>
                          </button>

                          {/* Clear / Reset */}
                          <button
                            type="button"
                            onClick={() => {
                              // Delete cookies
                              document.cookie = "travellerName=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                              document.cookie = "travellerId=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                              document.cookie = "securityLevel=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

                              const isDeleted = !getCookie('travellerName') && !getCookie('travellerId');
                              if (isDeleted) {
                                setPopupMsg("Reset successful");
                                setSettingsTravellerName("");
                                setSettingsTravellerId("");
                                setActiveTravellerName("");
                                setActiveTravellerId("");
                                setActiveSecurityLevel(0);
                                setVerifyValidationError(null);
                              } else {
                                setPopupMsg("Reset failed");
                              }
                            }}
                            className="w-full py-3 bg-transparent border-2 border-[#FFB451]/20 hover:border-[#FFB451]/40 text-[#FFB451] rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t("Reset")}</span>
                          </button>
                        </div>

                        {activeTravellerName && (
                          <div className="text-[10px] font-mono text-[#FFB451]/60 pt-1.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                            <span>{t("Verified User")}: <strong className="text-white">{activeTravellerName}</strong></span>
                            <span>{t("Clearance")}: <strong className={`uppercase ${
                              activeSecurityLevel === 5 ? "text-[#3287F0]" :
                              activeSecurityLevel === 4 ? "text-[#FF9300]" :
                              activeSecurityLevel === 3 ? "text-[#FD0303]" :
                              activeSecurityLevel === 2 ? "text-[#F198E2]" :
                              activeSecurityLevel === 1 ? "text-[#00F4FF]" : "text-[#2AFF00]"
                            }`}>
                              {activeSecurityLevel === 5 ? "SCC Restricted" :
                               activeSecurityLevel === 4 ? "SLT Restricted" :
                               activeSecurityLevel === 3 ? "Top Secret" :
                               activeSecurityLevel === 2 ? "Restricted Record" :
                               activeSecurityLevel === 1 ? "Private Record" : "Public Record"}
                            </strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio Section */}
                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                        <div className="space-y-1">
                          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                            <Volume2 className="w-3 h-3 text-[#FFB451]" />
                            {t("AGT Anthem")}
                          </h3>
                        </div>
                        <button 
                          onClick={() => setAudioEnabled(!audioEnabled)}
                          className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 transition-all text-[10px] uppercase tracking-widest font-black cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] ${
                            audioEnabled ? 'opacity-100' : 'opacity-60'
                          }`}
                        >
                          {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-white" /> : <VolumeX className="w-3.5 h-3.5 text-white" />}
                          {audioEnabled ? t('Active') : t('Muted')}
                        </button>
                      </div>
                    </div>

                    {/* Region DB Source Section (last setting) */}
                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-white/5 space-y-4">
                      <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30 col-span-1 md:col-span-2">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                          <Database className="w-3 h-3 text-[#FFB451]" />
                          {t("Region DB Source")}
                        </h3>
                        <div className="space-y-4">
                          <button 
                            onClick={() => {
                              setShowSettings(false);
                              fetchData();
                            }}
                            className="w-full py-4 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-[#FF0500]/85 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                          >
                            {t("Re-Sync Region Data")}
                          </button>
                          {cacheTimestamp && (() => {
                            const formatted = formatCacheTimestamp(cacheTimestamp);
                            return formatted ? (
                              <div className="text-center text-[10px] text-blue-500 font-mono font-bold tracking-wider mt-2">
                                {t("Last Cache")}: {formatted.dateStr} {formatted.timeStr}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

            {/* Results Section - Full Width for Table */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                {matchedRecords.length > 0 ? (
                  <motion.section
                    key="results"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="rounded-2xl overflow-hidden border-2 border-[#FF0500] shadow-[0_0_30px_rgba(255,5,0,0.15)] bg-black/40"
                  >
                    <div className="p-8 border-b border-[#FF0500]/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-medium text-[#FFB451]">
                            {t("AGT Galactic Archives Results")}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-[#FF0500]/10 text-[10px] text-[#FFB451] border border-[#FF0500]/45 font-mono">
                            {matchedRecords.length} {t("FOUND")}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="px-2 py-0.5 rounded-full bg-[#FF0500]/10 text-[10px] text-[#FFB451] border border-[#FF0500]/45 font-mono">
                            {t("Classified Records Omitted:")} {classifiedOmittedCount}
                          </span>
                        </div>

                        <p className="text-[10px] text-[#FFB451] uppercase tracking-[0.2em]">{t("Verified Galactic Ledger Matches")}</p>
                      </div>
 
                      {/* Download and Export Buttons Preceding the Record List */}
                      <div className="flex flex-wrap items-center gap-3">
                        {reportType === 'Simple' && (
                          <button
                            onClick={downloadFullReportPdf}
                            className="flex items-center gap-2 px-5 py-3 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t("PDF Report")}</span>
                          </button>
                        )}
                        {reportType === 'Custom' && (
                          <button
                            onClick={downloadFullReportPdf}
                            className="flex items-center gap-2 px-5 py-3 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t("PDF Report")}</span>
                          </button>
                        )}
                        <button
                          onClick={downloadFullReportCsv}
                          className="flex items-center gap-2 px-5 py-3 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t("Export CSV")}</span>
                        </button>
                      </div>
                    </div>
 
                    {/* Top synchronized horizontal scrollbar when needed */}
                    {isScrollNeeded && (
                      <div 
                        ref={topScrollRef} 
                        onScroll={handleTopScroll} 
                        className="overflow-x-auto custom-scrollbar w-full bg-[#161616] border-b border-[#FF0500]/25"
                      >
                        <div style={{ width: `${tableScrollWidth}px` }} className="h-1.5"></div>
                      </div>
                    )}

                    <div 
                      ref={tableContainerRef}
                      onScroll={handleTableScroll}
                      className="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar relative"
                    >
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#161616] border-b border-[#FF0500]/25 sticky top-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                            {columns.filter(col => col.enabled).map((col, idx) => {
                              const isSorted = sortColumn === col.name;
                              const isReducedCol = col.colIndex !== undefined && [1, 10, 11, 12, 18, 19, 23].includes(col.colIndex);
                              const headerStyle = getColumnStyle(col.colIndex);
                              return (
                                <th 
                                  key={idx} 
                                  onClick={() => toggleSort(col.name)}
                                  style={headerStyle}
                                  className={`py-3.5 px-4 text-[0.625rem] uppercase tracking-widest font-bold text-[#FFB451] cursor-pointer hover:bg-[#FF0500]/10 hover:text-white transition-all group/th overflow-hidden ${
                                    isReducedCol ? 'whitespace-normal break-normal' : 'whitespace-nowrap text-ellipsis'
                                  }`}
                                  title={`${t("Click to sort by")} ${t(col.name)}`}
                                >
                                  <div className="flex items-start gap-1 select-none">
                                    <span className={isReducedCol ? "line-clamp-2 block leading-normal" : "whitespace-nowrap overflow-hidden text-ellipsis"}>
                                      {t(col.name)}
                                    </span>
                                    {isSorted ? (
                                      sortDirection === 'asc' ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-[#FF0500] shrink-0 mt-0.5" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-[#FF0500] shrink-0 mt-0.5" />
                                      )
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-[#FFB451]/30 group-hover/th:text-[#FFB451]/60 shrink-0 transition-colors mt-0.5" />
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FF0500]/20">
                          {paginatedRecords.map((record, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/[0.04] transition-colors group">
                              {columns.filter(col => col.enabled).map((col, cIdx) => {
                                const val = record[col.name];
                                const isNarrowUrlCol = col.colIndex === 20 || col.colIndex === 21 || col.colIndex === 22 || col.colIndex === 32;
                                const isLinkCol = isNarrowUrlCol || col.name === 'NMS Wiki Link' || String(col.name).toLowerCase().includes('wiki') || String(col.name).toLowerCase().includes('link');
                                const isValidUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                                
                                const cellStyle = getColumnStyle(col.colIndex);
                                const isReducedCol = col.colIndex !== undefined && [1, 10, 11, 12, 18, 19, 23].includes(col.colIndex);
                                
                                return (
                                  <td 
                                    key={cIdx} 
                                    style={cellStyle}
                                    className={`py-1.5 px-4 text-[0.71875rem] leading-normal text-[#FFB451] font-mono overflow-hidden text-ellipsis max-w-[200px] ${
                                      isReducedCol ? 'whitespace-normal break-normal' : 'whitespace-nowrap'
                                    }`}
                                  >
                                    {isNarrowUrlCol && val && (isValidUrl || val.includes('.')) ? (
                                      <a 
                                        href={isValidUrl ? val : `https://${val}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[#3b82f6] hover:text-blue-400 hover:underline font-black cursor-pointer"
                                      >
                                        LINK
                                      </a>
                                    ) : isLinkCol && val && (isValidUrl || val.includes('.')) ? (
                                      <a 
                                        href={isValidUrl ? val : `https://${val}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[#FF0500] hover:underline hover:text-[#FF0500]/80 font-black cursor-pointer"
                                      >
                                        {val}
                                      </a>
                                    ) : (
                                      val || <span className="text-[#FFB451]/40 italic">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-[#FF0500] bg-[#0c0c0c]">
                          <tr>
                            {columns.filter(col => col.enabled).map((col, idx) => {
                              const isTotalCol = col.name === 'Points' || col.name === columns[4]?.name;
                              const isFirstCol = idx === 0 || col.name === columns[0]?.name;
                              return (
                                <td key={idx} className="py-2 px-4 text-[0.6875rem] font-bold text-[#FFB451]">
                                  {isTotalCol ? (
                                    <span>{t("TOTAL:")} {totalPoints}</span>
                                  ) : isFirstCol ? (
                                    <span className="uppercase tracking-widest text-[0.625rem] text-[#FFB451] font-bold">{t("Number of Regions")}</span>
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
 
                    {/* Pagination Interface (Exceeds 15 records) */}
                    {totalPages > 1 && (
                      <div className="py-3 px-8 border-t border-[#FF0500]/20 bg-[#FF0500]/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-mono text-[#FFB451] uppercase tracking-wider">
                          {t("Showing Page")} <span className="text-[#FFB451] font-bold decoration-2">{currentPage}</span> {t("of")} <span className="text-[#FFB451] font-bold">{totalPages}</span> ({matchedRecords.length || 0} {t("total rows")})
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("First")}
                          </button>
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("Prev")}
                          </button>
 
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                            const isNear = Math.abs(pg - currentPage) <= 1;
                            const isBoundary = pg === 1 || pg === totalPages;
                            if (!isNear && !isBoundary) {
                              if (pg === 2 || pg === totalPages - 1) {
                                return <span key={pg} className="text-[10px] text-[#FFB451]/30 font-mono px-0.5">...</span>;
                              }
                              return null;
                            }
                            return (
                              <button
                                key={pg}
                                onClick={() => setCurrentPage(pg)}
                                className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  currentPage === pg 
                                    ? 'bg-[#FF0500] text-white border-2 border-[#FF0500] shadow-[0_0_12px_rgba(255,5,0,0.45)] font-black' 
                                    : 'bg-black/30 border-2 border-[#FF0500] text-[#FFB451] hover:bg-[#FF0500]/15'
                                }`}
                              >
                                {pg}
                              </button>
                            );
                          })}
 
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("Next")}
                          </button>
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("Last")}
                          </button>
                        </div>
                      </div>
                    )}
 
                    <div className="p-6 border-t border-[#FF0500]/20 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#FF0500]/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center justify-center w-2.5 h-2.5">
                            <span className={`animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full opacity-75 ${
                              loading ? 'bg-yellow-500' : 
                              isUsingCache ? 'bg-blue-500' : 
                              sheetUrl ? 'bg-emerald-500' : 'bg-red-500'
                            }`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                              loading ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' :
                              isUsingCache ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                              sheetUrl ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                              'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                            }`}></span>
                          </div>
                          <span className="text-[9px] uppercase tracking-widest text-[#FFB451] font-bold">{t("Ledger Integrity: Verified")}</span>
                        </div>
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#FFB451]">
                        {t("AGT SECURE ARCHIVE CLIENT")}
                      </div>
                    </div>
                  </motion.section>
                ) : !loading && (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-32 flex flex-col items-center justify-center text-center space-y-6 border border-[#FFB451]/10 rounded-2xl bg-[#FFB451]/5"
                  >
                    <div className="w-16 h-16 rounded-full border border-[#FFB451]/10 flex items-center justify-center">
                      <Database className="w-6 h-6 text-[#FFB451]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#FFB451]">{t("Terminal Ready")}</p>
                      <p className="text-xs font-light text-[#FFB451]">{t("Report Generation Sequence Pending Civilization Selection")}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Area */}
      <footer className="bg-[#FFB451] mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center gap-6 text-black">
          <div className="flex flex-wrap justify-center items-center gap-y-2 text-[10px] uppercase tracking-[0.2em] font-bold">
            <a href="https://www.nms-agt.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Home</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/about-the-agt" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">About</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/team" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Team</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/contribute" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Contribute</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/agt-galactic-archives" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Galactic Archives</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/engage" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Engage</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/agt-navi" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">AGT NAVI</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/terms" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Terms</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/support" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Support</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/terms/copyright" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Copyright</a>
          </div>
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold">&copy; 2026 Alliance of Galactic Travellers</p>
        </div>
      </footer>

      {/* Extract Reports Loading Overlay */}
      <AnimatePresence>
        {isExtracting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 pointer-events-auto"
          >
            <motion.img
              src="/AgtOfficialLogo.png"
              alt="AGT Official Logo"
              className="w-48 h-48 object-contain"
              initial={{ rotateY: 0, scale: 0.8 }}
              animate={{ rotateY: 360 * 3, scale: [0.8, 1.15, 0.8] }}
              exit={{ rotateY: 360 * 4, scale: 0, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== window.location.origin + "/AGTIcon.png") {
                  img.src = "/AGTIcon.png";
                }
              }}
            />
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-[#FF0500] text-sm uppercase tracking-[0.25em] font-extrabold text-center mt-6"
            >
              {t("Processing Galactic Archive...")}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Generation Loading Overlay */}
      <AnimatePresence>
        {isGeneratingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[260] flex flex-col items-center justify-center p-4 pointer-events-auto"
          >
            <motion.img
              src="/AGTIcon.png"
              alt="AGT Icon"
              className="w-48 h-48 object-contain"
              animate={{ rotateY: 360 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== window.location.origin + "/AgtOfficialLogo.png") {
                  img.src = "/AgtOfficialLogo.png";
                }
              }}
            />
            <p className="text-[#FF0500] text-sm uppercase tracking-[0.25em] font-extrabold text-center mt-6">
              Preparing AGT Data Packet
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Database Syncing Loading Overlay */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[260] flex flex-col items-center justify-center p-4 pointer-events-auto"
          >
            <motion.img
              src="/AGTIcon.png"
              alt="AGT Icon"
              className="w-48 h-48 object-contain"
              animate={{ rotateY: 360 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== window.location.origin + "/AgtOfficialLogo.png") {
                  img.src = "/AgtOfficialLogo.png";
                }
              }}
            />
            <p className="text-[#FF0500] text-sm uppercase tracking-[0.25em] font-extrabold text-center mt-6">
              AGT Galactic Archive Sync In Progress
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Audio */}
      <audio 
        ref={audioRef}
        src="/AGT Anthem (Instrumental).mp3"
        loop
        preload="auto"
      />
    </div>
  );
}

