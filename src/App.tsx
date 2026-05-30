/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
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
  Sliders
} from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CIVILIZATIONS, GALAXIES } from './constants';

// Column configuration mapping
interface ColumnConfig {
  name: string;
  enabled: boolean;
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

  const [searchKey, setSearchKey] = useState('');
  const [selectedGalaxy, setSelectedGalaxy] = useState('All');
  const [isGalaxyDropdownOpen, setIsGalaxyDropdownOpen] = useState(false);
  const [activeGalaxyIndex, setActiveGalaxyIndex] = useState(0);
  const autocompleteRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [reportType, setReportType] = useState<'Simple' | 'Detailed'>('Simple');
  const [allRawRows, setAllRawRows] = useState<string[][]>([]);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedRecords, setMatchedRecords] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);

  // Reset to first page when search filters or matches change
  useEffect(() => {
    setCurrentPage(1);
  }, [matchedRecords]);

  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const totalPages = Math.ceil(matchedRecords.length / itemsPerPage);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return matchedRecords.slice(start, start + itemsPerPage);
  }, [matchedRecords, currentPage, itemsPerPage]);

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
          enabled: true
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
    const currentCivTerm = (civTerm ?? searchKey).trim().toLowerCase();
    const currentGalTerm = (galTerm ?? selectedGalaxy).trim().toLowerCase();
    
    if (!currentCivTerm && currentGalTerm === 'all' && !sourceCols.length) return;

    // Column B (Galaxy) is at index 1, Column C (Civilization) is at index 2
    const galaxyFieldName = sourceCols[1]?.name;
    const civFieldName = sourceCols[2]?.name;
    
    if (!civFieldName || !galaxyFieldName) {
      setMatchedRecords([]);
      setError('Required matching fields not found.');
      return;
    }

    const matches = sourceData.filter(row => {
      const civMatch = currentCivTerm === 'all' || !currentCivTerm || 
                      String(row[civFieldName] || '').toLowerCase().includes(currentCivTerm);
      const galMatch = currentGalTerm === 'all' || 
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
    const civFilterVal = searchKey || 'All';
    
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
      columns.filter(col => col.enabled).map(col => record[col.name] || '-')
    );

    // Add total row to PDF
    const totalFieldName = columns[4]?.name || 'Points';
    const totalRow = columns.filter(col => col.enabled).map(col => {
      if (col.name === totalFieldName) return `TOTAL: ${totalPoints}`;
      if (col.name === columns[0]?.name) return 'Number of Regions';
      return '';
    });
    tableData.push(totalRow);

    autoTable(doc, {
      startY: 28, // start table below repeating header boundary at Y=22
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [42, 42, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
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
        doc.setTextColor(255, 5, 0);
        doc.text(`AGT Region Report - Galaxy: ${galaxyFilterVal} / Civ: ${civFilterVal}`, logoX + 13, logoY + 6);
        
        // Page number to the right side of the header (starts on Page 1)
        doc.setFontSize(8);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${data.pageNumber}`, 277, logoY + 6, { align: "right" });

        doc.setDrawColor(255, 5, 0);
        doc.setLineWidth(0.5);
        doc.line(logoX, logoY + logoSize + 2, 277, logoY + logoSize + 2);
        
        // Dynamic Footer starting on Page 1
        if (data.pageNumber >= 1) {
          doc.setFontSize(8);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(150, 150, 150);
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
              <h1 className="font-bold text-xs tracking-[0.2em] uppercase text-[#FFB451]">Alliance of Galactic Travellers</h1>
              <span className="text-[9px] text-[#FFB451] uppercase tracking-[0.3em] font-bold">AGT Region Report Tool</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-[9px] text-[#FFB451] tracking-widest font-mono">
              STATUS: <span className={
                loading ? 'text-yellow-500' :
                sheetUrl ? 'text-emerald-500' : 
                'text-red-500'
              }>
                {loading ? 'SYNCING' : sheetUrl ? 'CONNECTED' : 'DISCONNECTED'}
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
              <h2 className="text-4xl font-light tracking-tight text-[#FFB451]">AGT Region Report Tool</h2>
              
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
                    Simple Report
                  </button>
                  <button
                    onClick={() => setReportType('Detailed')}
                    className={`px-5 py-2 text-[10px] uppercase font-black tracking-widest rounded-full transition-all cursor-pointer ${
                      reportType === 'Detailed'
                        ? 'bg-[#FF0500] text-white shadow-lg shadow-[#FF0500]/25'
                        : 'text-[#FFB451]/55 hover:text-[#FFB451]'
                    }`}
                  >
                    Detailed Report
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <div className="space-y-1">
                  <p className="text-[#FFB451] text-[10px] font-bold tracking-widest uppercase">Criteria 1</p>
                  <p className="text-[#FFB451] text-xs font-bold tracking-widest uppercase">Select Civilization</p>
                </div>
                <div className="h-px w-8 bg-[#FFB451]/20 hidden md:block mt-4"></div>
                <div className="space-y-1">
                  <p className="text-[#FFB451] text-[10px] font-bold tracking-widest uppercase">Criteria 2</p>
                  <p className="text-[#FFB451] text-xs font-bold tracking-widest uppercase">Preferred Galaxy</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Civilization Dropdown */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451] transition-colors">
                  <Search className="h-5 w-5" />
                </div>
                <select
                  value={searchKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchKey(val);
                    if (data.length) {
                      findRecord(data, columns, val, selectedGalaxy);
                    } else {
                      fetchData();
                    }
                  }}
                  className="block w-full pl-14 pr-12 py-5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] appearance-none shadow-[0_0_25px_rgba(255,5,0,0.25)] focus:shadow-[0_0_35px_rgba(255,5,0,0.55)]"
                  id="civilization-select"
                >
                  <option value="" disabled className="bg-[#2a2a2a] text-[#FFB451]">-- Choose Civilization --</option>
                  <option value="All" className="bg-[#2a2a2a] text-[#FFB451]">All</option>
                  {CIVILIZATIONS.map(civ => (
                    <option key={civ} value={civ} className="bg-[#2a2a2a] text-[#FFB451]">{civ}</option>
                  ))}
                </select>
                <div className="absolute right-4 inset-y-0 flex items-center pointer-events-none text-[#FFB451]">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>

              {/* Galaxy Dropdown/Search */}
              <div ref={autocompleteRef} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451] transition-colors z-10">
                  <Globe className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={selectedGalaxy}
                  placeholder="Type or select galaxy..."
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
                                Show All
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

            <button
              onClick={handleSearch}
              disabled={loading || (!searchKey && selectedGalaxy === 'All')}
              className="px-20 py-5 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-full font-black text-sm uppercase tracking-[0.2em] hover:bg-[#FF0500]/85 active:scale-[0.96] disabled:opacity-25 disabled:pointer-events-none shadow-[0_4px_15px_rgba(255,5,0,0.3)] hover:shadow-[0_0_25px_rgba(255,5,0,0.5)] transition-all flex items-center gap-2 cursor-pointer"
              id="fetch-btn"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 text-white" />
                  <span className="text-white">Extract Reports</span>
                </>
              )}
            </button>

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
                    {/* Data Section */}
                    <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                        <Database className="w-3 h-3 text-[#FFB451]" />
                        Source Identity
                      </h3>
                      <div className="space-y-4">
                        <button 
                          onClick={fetchData}
                          className="w-full py-4 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-[#FF0500]/85 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                        >
                          Re-Sync Region Data
                        </button>
                      </div>
                    </div>

                    {/* Display Settings Section */}
                    <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                        <Sliders className="w-3 h-3 text-[#FFB451]" />
                        Display Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">Max Records on screen</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value={15} className="bg-[#161616] text-[#FFB451]">15 Records</option>
                            <option value={30} className="bg-[#161616] text-[#FFB451]">30 Records</option>
                            <option value={50} className="bg-[#161616] text-[#FFB451]">50 Records</option>
                            <option value={100} className="bg-[#161616] text-[#FFB451]">100 Records</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">Text Scaling (Desktop Mode)</span>
                          <select
                            value={textScale}
                            onChange={(e) => {
                              setTextScale(e.target.value);
                              localStorage.setItem('agt_text_scale', e.target.value);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value="1" className="bg-[#161616] text-[#FFB451]">1x (Default)</option>
                            <option value="1.5" className="bg-[#161616] text-[#FFB451]">1.5x</option>
                            <option value="2" className="bg-[#161616] text-[#FFB451]">2x</option>
                            <option value="2.5" className="bg-[#161616] text-[#FFB451]">2.5x</option>
                            <option value="3" className="bg-[#161616] text-[#FFB451]">3x</option>
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
                            AGT Anthem
                          </h3>
                        </div>
                        <button 
                          onClick={() => setAudioEnabled(!audioEnabled)}
                          className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 transition-all text-[10px] uppercase tracking-widest font-black cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] ${
                            audioEnabled ? 'opacity-100' : 'opacity-60'
                          }`}
                        >
                          {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-white" /> : <VolumeX className="w-3.5 h-3.5 text-white" />}
                          {audioEnabled ? 'Active' : 'Muted'}
                        </button>
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
                          AGT Galactic Archives Results
                          <span className="px-2 py-0.5 rounded-full bg-[#FF0500]/10 text-[10px] text-[#FFB451] border border-[#FF0500]/45 font-mono">
                            {matchedRecords.length} FOUND
                          </span>
                        </h3>
                        <p className="text-[10px] text-[#FFB451] uppercase tracking-[0.2em]">Verified Galactic Ledger Matches</p>
                      </div>
 
                      {/* Download and Export Buttons Preceding the Record List */}
                      <div className="flex flex-wrap items-center gap-3">
                        {reportType === 'Simple' && (
                          <button
                            onClick={downloadFullReportPdf}
                            className="flex items-center gap-2 px-5 py-3 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Export PDF</span>
                          </button>
                        )}
                        <button
                          onClick={downloadFullReportCsv}
                          className="flex items-center gap-2 px-5 py-3 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>
 
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FF0500]/[0.05] border-b border-[#FF0500]/25">
                            {columns.filter(col => col.enabled).map((col, idx) => (
                              <th key={idx} className="py-2 px-4 text-[0.625rem] uppercase tracking-widest font-bold text-[#FFB451] whitespace-nowrap">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FF0500]/20">
                          {paginatedRecords.map((record, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/[0.04] transition-colors group">
                              {columns.filter(col => col.enabled).map((col, cIdx) => {
                                const val = record[col.name];
                                const isLinkCol = col.name === 'NMS Wiki Link' || String(col.name).toLowerCase().includes('wiki') || String(col.name).toLowerCase().includes('link');
                                const isValidUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                                
                                return (
                                  <td key={cIdx} className="py-1.5 px-4 text-[0.71875rem] leading-none text-[#FFB451] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                    {isLinkCol && val && (isValidUrl || val.includes('.')) ? (
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
                                    <span>TOTAL: {totalPoints}</span>
                                  ) : isFirstCol ? (
                                    <span className="uppercase tracking-widest text-[0.625rem] text-[#FFB451] font-bold">Number of Regions</span>
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
                          Showing Page <span className="text-[#FFB451] font-bold decoration-2">{currentPage}</span> of <span className="text-[#FFB451] font-bold">{totalPages}</span> ({matchedRecords.length} total rows)
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            First
                          </button>
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            Prev
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
                            Next
                          </button>
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    )}
 
                    <div className="p-6 border-t border-[#FF0500]/20 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#FF0500]/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF0500] shadow-[0_0_8px_rgba(255,5,0,0.5)]"></div>
                          <span className="text-[9px] uppercase tracking-widest text-[#FFB451] font-bold">Ledger Integrity: Verified</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#FFB451] uppercase tracking-widest hidden md:inline">
                          Index Reference: {Math.random().toString(16).substring(2, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#FFB451]">
                        AGT SECURE ARCHIVE CLIENT
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
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#FFB451]">Terminal Ready</p>
                      <p className="text-xs font-light text-[#FFB451]">Report Generation Sequence Pending Civilization Selection</p>
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
              Processing Galactic Archive...
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

