import { useState } from 'react';
import { Upload } from 'lucide-react';
import { parseAFD } from '../utils/parseAFD';
import { parseCSV } from '../utils/parseCSV';
import { processRecords } from '../utils/calculations';
import { mergeRecords, addImportHistory, addEmployee, getEmployees } from '../utils/storage';
import { colors } from '../styles/theme';

export default function FileImport({ onImport }) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;

      let result = parseAFD(content);
      if (result.punches.length === 0) {
        result = parseCSV(content);
      }

      if (result.punches.length === 0) {
        alert('Nenhum registro encontrado no arquivo. Verifique o formato.');
        return;
      }

      // Auto-cadastrar funcionários encontrados no arquivo
      const existingEmployees = getEmployees();
      const knownPis = new Set(existingEmployees.map(e => e.pis));

      for (const [pis, name] of Object.entries(result.names)) {
        if (!knownPis.has(pis) && name) {
          addEmployee({ pis, name, department: '', role: '', startTime: '', endTime: '' });
        }
      }

      const processed = processRecords(result.punches);
      const merged = mergeRecords(processed);

      addImportHistory({
        filename: file.name,
        punches: result.punches.length,
        records: processed.length,
        employees: new Set(result.punches.map(p => p.pis)).size,
      });

      if (onImport) onImport(merged);
    };
    reader.readAsText(file, 'latin1');
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => document.getElementById('fileInput').click()}
      style={{
        border: `2px dashed ${dragOver ? colors.blue : colors.inputBorder}`,
        borderRadius: 16, padding: '50px 30px', textAlign: 'center',
        background: dragOver ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.02)',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <input id="fileInput" type="file" accept=".txt,.afd,.csv"
        style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      <div style={{
        width: 60, height: 60, background: 'rgba(59,130,246,0.15)',
        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', color: colors.blue,
      }}>
        <Upload size={28} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
        Arraste o arquivo aqui ou clique para selecionar
      </h3>
      <p style={{ color: colors.textDark, fontSize: 13 }}>
        Suporta: AFD (Portaria 671 / 1510) &bull; TXT &bull; CSV (PIS;DATA;HORA)
      </p>
    </div>
  );
}
