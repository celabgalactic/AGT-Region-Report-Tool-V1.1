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
  RotateCcw
} from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CIVILIZATIONS, GALAXIES } from './constants';
// @ts-ignore
import regionsIcon from './regions-icon.png';

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
    zh: "贡献"
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
  }
};

// Column configuration mapping
interface ColumnConfig {
  name: string;
  enabled: boolean;
  colIndex?: number;
}

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
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initial fetch and manual font loading
  useEffect(() => {
    if (sheetUrl) {
      fetchData();
    }

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

  const [reportType, setReportType] = useState<'Simple' | 'Detailed'>('Simple');
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
        complete: (results) => {
          const rawRows = results.data as string[][];
          if (rawRows.length < 2) {
            setError('The source sheet data is insufficient (need at least 2 rows).');
            setLoading(false);
            return;
          }

          setAllRawRows(rawRows);
          setLoading(false);
        },
        error: (err: any) => {
          setError(`Parsing error: ${err.message}`);
          setLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      setLoading(false);
    }
  };

  // Process rows whenever report type or raw rows change
  useEffect(() => {
    if (allRawRows.length >= 2) {
      const headers = allRawRows[1];
      const targetIndexes = reportType === 'Simple'
        ? [0, 1, 2, 3, 9, 10, 20] // A, B, C, D, J, K, U
        : [0, 1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 31, 32]; // A, B, C, D, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, AF, AG

      const filteredColumns = targetIndexes.map(idx => {
        let baseName = headers[idx] || `Col ${String.fromCharCode(65 + idx)}`;
        if (idx === 31) baseName = headers[31] || "AF";
        if (idx === 32) baseName = headers[32] || "AG";
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
          return rowObj;
        });

      setData(processedData);

      if (searchKey || selectedGalaxy !== 'All') {
        findRecord(processedData, filteredColumns, searchKey, selectedGalaxy);
      }
    }
  }, [reportType, allRawRows]);

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

  const findRecord = (sourceData: any[], sourceCols: ColumnConfig[], civTerm?: string, galTerm?: string) => {
    let currentCivTerm = (civTerm ?? searchKey).trim().toLowerCase();
    let currentGalTerm = (galTerm ?? selectedGalaxy).trim().toLowerCase();
    
    // Treat AGT as Alliance of Galactic Travellers
    if (currentCivTerm === 'agt') {
      currentCivTerm = 'alliance of galactic travellers';
    }

    // Column B (Galaxy) is at index 1, Column C (Civilization) is at index 2
    const galaxyFieldName = sourceCols[1]?.name;
    const civFieldName = sourceCols[2]?.name;
    
    if (!civFieldName || !galaxyFieldName) {
      setMatchedRecords([]);
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
      return civMatch && galMatch;
    });

    // Sort by Column B (Galaxy) then Column A (Region Name)
    const nameFieldName = sourceCols[0]?.name;
    const sortedMatches = [...matches].sort((a, b) => {
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
    if (reportType !== 'Simple') return;
    if (matchedRecords.length === 0) return;

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

    const tableHeaders = columns.filter(col => col.enabled).map(col => col.name);
    const tableData = matchedRecords.map(record => 
      columns.filter(col => col.enabled).map(col => {
        const val = record[col.name];
        if (col.colIndex === 20 || col.colIndex === 21 || col.colIndex === 22 || col.colIndex === 32) {
          const isValid = typeof val === 'string' && val.trim().length > 0;
          return isValid ? 'LINK' : '-';
        }
        return record[col.name] || '-';
      })
    );

    // Add total row to PDF
    const totalFieldName = columns[4]?.name || 'Points';
    const totalRow = columns.filter(col => col.enabled).map(col => {
      if (col.name === totalFieldName) return `TOTAL: ${totalPoints}`;
      if (col.name === columns[0]?.name) return 'Number of Regions';
      return '';
    });
    tableData.push(totalRow);

    const colStyles: { [key: number]: any } = {};
    columns.filter(col => col.enabled).forEach((col, idx) => {
      if (col.colIndex === 20 || col.colIndex === 21 || col.colIndex === 22 || col.colIndex === 32) {
        colStyles[idx] = { cellWidth: 14 }; // Comfortable width for "LINK" (4 characters) plus padding
      }
    });

    autoTable(doc, {
      startY: 28, // start table below repeating header boundary at Y=22
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [42, 42, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
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
  };

  const downloadFullReportCsv = () => {
    if (matchedRecords.length === 0) return;

    const displayHeaders = columns.filter(col => col.enabled).map(col => col.name);
    const rows = matchedRecords.map(record =>
      columns.filter(col => col.enabled).map(col => record[col.name] || '')
    );

    const totalFieldName = columns[4]?.name || 'Points';
    const totalRow = columns.filter(col => col.enabled).map(col => {
      if (col.name === totalFieldName) return `TOTAL: ${totalPoints}`;
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
    const displayId = searchKey || 'Bulk';
    const filename = displayId.replace(/[^a-z0-9]/gi, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `agt_full_report_${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <div className="hidden md:block text-[9px] text-[#FFB451] tracking-widest font-mono">
              {t("STATUS:")} <span className={
                loading ? 'text-yellow-500' :
                sheetUrl ? 'text-emerald-500' : 
                'text-red-500'
              }>
                {loading ? t('SYNCING') : sheetUrl ? t('CONNECTED') : t('DISCONNECTED')}
              </span>
            </div>
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

      <main className="max-w-5xl mx-auto px-6 py-16">
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
                <div className="inline-flex p-1 bg-[#161616] border-2 border-[#FF0500] rounded-full">
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
                </div>
              </div>
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
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
                if (data.length) {
                  findRecord(data, columns, '', '');
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
                            <option value="th" className="bg-[#161616] text-[#FFB451]">ไทย (TH)</option>
                            <option value="hi" className="bg-[#161616] text-[#FFB451]">हिन्दी (HI)</option>
                            <option value="ja" className="bg-[#161616] text-[#FFB451]">日本語 (JA)</option>
                            <option value="zh" className="bg-[#161616] text-[#FFB451]">中文 (ZH)</option>
                            <option value="it" className="bg-[#161616] text-[#FFB451]">Italiano (IT)</option>
                          </select>
                        </div>
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
                            onClick={fetchData}
                            className="w-full py-4 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-[#FF0500]/85 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                          >
                            {t("Re-Sync Region Data")}
                          </button>
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
                      <div className="space-y-1">
                        <h3 className="text-xl font-medium text-[#FFB451] flex items-center gap-3">
                          {t("AGT Galactic Archives Results")}
                          <span className="px-2 py-0.5 rounded-full bg-[#FF0500]/10 text-[10px] text-[#FFB451] border border-[#FF0500]/45 font-mono">
                            {matchedRecords.length} {t("FOUND")}
                          </span>
                        </h3>
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
                            <span>{t("Export PDF")}</span>
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
                              const isNarrowUrlCol = col.colIndex === 20 || col.colIndex === 21 || col.colIndex === 22 || col.colIndex === 32;
                              const headerStyle = isNarrowUrlCol 
                                ? { width: 'calc(4ch + 2rem)', minWidth: 'calc(4ch + 2rem)', maxWidth: 'calc(4ch + 2rem)' } 
                                : undefined;
                              return (
                                <th 
                                  key={idx} 
                                  onClick={() => toggleSort(col.name)}
                                  style={headerStyle}
                                  className="py-3.5 px-4 text-[0.625rem] uppercase tracking-widest font-bold text-[#FFB451] whitespace-nowrap cursor-pointer hover:bg-[#FF0500]/10 hover:text-white transition-all group/th overflow-hidden text-ellipsis"
                                  title={`${t("Click to sort by")} ${t(col.name)}`}
                                >
                                  <div className="flex items-center gap-2 select-none">
                                    <span>{t(col.name)}</span>
                                    {isSorted ? (
                                      sortDirection === 'asc' ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-[#FF0500] shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-[#FF0500] shrink-0" />
                                      )
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-[#FFB451]/30 group-hover/th:text-[#FFB451]/60 shrink-0 transition-colors" />
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
                                
                                const cellStyle = isNarrowUrlCol 
                                  ? { width: 'calc(4ch + 2rem)', minWidth: 'calc(4ch + 2rem)', maxWidth: 'calc(4ch + 2rem)' } 
                                  : undefined;
                                
                                return (
                                  <td 
                                    key={cIdx} 
                                    style={cellStyle}
                                    className="py-1.5 px-4 text-[0.71875rem] leading-none text-[#FFB451] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
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
                            <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                          </div>
                          <span className="text-[9px] uppercase tracking-widest text-[#FFB451] font-bold">{t("Ledger Integrity: Verified")}</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#FFB451] uppercase tracking-widest hidden md:inline">
                          {t("Index Reference:")} {Math.random().toString(16).substring(2, 8).toUpperCase()}
                        </span>
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

