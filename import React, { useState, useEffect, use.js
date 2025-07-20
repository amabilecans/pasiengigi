import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { Smile, User, Calendar, MapPin, Heart, Briefcase, ClipboardPaste, Send, Droplets, ShieldAlert, Share2, List, FilePlus, Trash2, AlertTriangle, Edit } from 'lucide-react';

// --- Konfigurasi Firebase ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-dental-survey';

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Definisi Kode Kondisi Gigi ---
const permanentConditionCodes = {
  '0': { text: 'Sehat', color: 'bg-green-200', textColor: 'text-green-800' },
  '1': { text: 'Karies', color: 'bg-red-200', textColor: 'text-red-800' },
  '2': { text: 'Tumpatan dg Karies', color: 'bg-yellow-200', textColor: 'text-yellow-800' },
  '3': { text: 'Tumpatan tanpa Karies', color: 'bg-blue-200', textColor: 'text-blue-800' },
  '4': { text: 'Cabut krn Karies', color: 'bg-gray-400', textColor: 'text-gray-800' },
  '5': { text: 'Cabut krn Lain', color: 'bg-gray-300', textColor: 'text-gray-700' },
  '6': { text: 'Fissure Sealant', color: 'bg-purple-200', textColor: 'text-purple-800' },
  '7': { text: 'Protesa/Implan', color: 'bg-indigo-200', textColor: 'text-indigo-800' },
  '8': { text: 'Tidak Tumbuh', color: 'bg-gray-200', textColor: 'text-gray-600' },
  '-': { text: 'Lain-lain', color: 'bg-white', textColor: 'text-gray-500' },
};

const deciduousConditionCodes = {
  'A': { text: 'Sehat', color: 'bg-green-200', textColor: 'text-green-800' },
  'B': { text: 'Karies', color: 'bg-red-200', textColor: 'text-red-800' },
  'C': { text: 'Tumpatan dg Karies', color: 'bg-yellow-200', textColor: 'text-yellow-800' },
  'D': { text: 'Tumpatan tanpa Karies', color: 'bg-blue-200', textColor: 'text-blue-800' },
  'E': { text: 'Cabut krn Karies', color: 'bg-gray-400', textColor: 'text-gray-800' },
  'F': { text: 'Fissure Sealant', color: 'bg-purple-200', textColor: 'text-purple-800' },
  'G': { text: 'Protesa/Implan', color: 'bg-indigo-200', textColor: 'text-indigo-800' },
  '-': { text: 'Lain-lain', color: 'bg-white', textColor: 'text-gray-500' },
};

// --- Struktur Gigi (Odontogram) ---
const toothStructure = {
  upperRight: { permanent: [18, 17, 16, 15, 14, 13, 12, 11], deciduous: [55, 54, 53, 52, 51] },
  upperLeft:  { permanent: [21, 22, 23, 24, 25, 26, 27, 28], deciduous: [61, 62, 63, 64, 65] },
  lowerLeft:  { permanent: [31, 32, 33, 34, 35, 36, 37, 38], deciduous: [71, 72, 73, 74, 75] },
  lowerRight: { permanent: [48, 47, 46, 45, 44, 43, 42, 41], deciduous: [85, 84, 83, 82, 81] }
};

const allTeeth = Object.values(toothStructure).flatMap(quadrant => [...quadrant.permanent, ...quadrant.deciduous]);
const deciduousTeethSet = new Set(Object.values(toothStructure).flatMap(quadrant => quadrant.deciduous));


// --- Komponen-komponen Aplikasi ---

const Tooth = ({ number, status, onClick }) => {
  const isDeciduous = deciduousTeethSet.has(number);
  const condition = isDeciduous ? deciduousConditionCodes[status] : permanentConditionCodes[status];
  
  return (
    <div 
      className={`w-9 h-11 sm:w-10 sm:h-12 border-2 border-pink-300 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-pink-500 hover:scale-105 ${condition?.color || 'bg-white'} ${condition?.textColor || 'text-gray-800'}`}
      onClick={() => onClick(number)}
    >
      <span className="font-bold text-xs sm:text-sm">{number}</span>
      <span className="text-[9px] sm:text-[10px] mt-0.5 px-0.5 text-center leading-tight">{condition?.text || 'N/A'}</span>
    </div>
  );
};

const StatusModal = ({ isOpen, onClose, onSave, toothNumber }) => {
  if (!isOpen) return null;
  const isDeciduous = deciduousTeethSet.has(toothNumber);
  const options = isDeciduous ? deciduousConditionCodes : permanentConditionCodes;
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const defaultStatus = isDeciduous ? 'A' : '0';
    return options[defaultStatus] ? defaultStatus : Object.keys(options)[0];
  });
  const handleSave = () => { onSave(toothNumber, selectedStatus); onClose(); };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm transform transition-all scale-95 animate-modal-pop">
        <h3 className="text-xl font-bold text-pink-700 mb-4">Pilih Kondisi Gigi: {toothNumber}</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {Object.entries(options).map(([code, { text, color, textColor }]) => (
            <label key={code} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedStatus === code ? 'ring-2 ring-pink-500 shadow-md' : 'hover:bg-pink-100'} ${color} ${textColor}`}>
              <input type="radio" name="status" value={code} checked={selectedStatus === code} onChange={() => setSelectedStatus(code)} className="sr-only"/>
              <span className="font-semibold">{code}: {text}</span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors">Batal</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-700 transition-colors shadow-lg hover:shadow-xl">Simpan</button>
        </div>
      </div>
    </div>
  );
};

const Odontogram = ({ toothData, onToothClick }) => {
  const renderRow = (teeth) => (
    <div className="flex justify-center gap-px sm:gap-1">
      {teeth.map(num => <Tooth key={num} number={num} status={toothData[num]} onClick={onToothClick} />)}
    </div>
  );

  return (
    <div className="bg-pink-100 p-2 sm:p-4 rounded-xl border border-pink-200 overflow-x-auto shadow-inner">
      <div className="inline-block min-w-full text-center">
        <div className="relative pb-2"><h4 className="text-lg font-bold text-pink-800 mb-2">Rahang Atas</h4><div className="flex justify-center">{renderRow(toothStructure.upperRight.deciduous)}<div className="w-px bg-pink-400 mx-1 sm:mx-2 self-stretch"></div>{renderRow(toothStructure.upperLeft.deciduous)}</div><div className="flex justify-center mt-1">{renderRow(toothStructure.upperRight.permanent)}<div className="w-px bg-pink-400 mx-1 sm:mx-2 self-stretch"></div>{renderRow(toothStructure.upperLeft.permanent)}</div></div>
        <hr className="border-t-2 border-dashed border-pink-400 my-2 sm:my-4" />
        <div className="relative pt-2"><h4 className="text-lg font-bold text-pink-800 mb-2">Rahang Bawah</h4><div className="flex justify-center">{renderRow(toothStructure.lowerRight.permanent)}<div className="w-px bg-pink-400 mx-1 sm:mx-2 self-stretch"></div>{renderRow(toothStructure.lowerLeft.permanent)}</div><div className="flex justify-center mt-1">{renderRow(toothStructure.lowerRight.deciduous)}<div className="w-px bg-pink-400 mx-1 sm:mx-2 self-stretch"></div>{renderRow(toothStructure.lowerLeft.deciduous)}</div></div>
      </div>
    </div>
  );
};


const SurveyForm = ({ onAddSurvey, userId, sessionId, setPage }) => {
  const initialToothData = useMemo(() => {
    const data = {};
    allTeeth.forEach(num => { data[num] = deciduousTeethSet.has(num) ? 'A' : '0'; });
    return data;
  }, []);
  
  const initialFormData = {
    nama: '', usia: '', jenisKelamin: 'Laki-laki', tanggalLahir: '', pekerjaan: '', alamat: '',
    tanggalPemeriksaan: new Date().toISOString().split('T')[0],
    rekomendasi: '', rujukan: 'Tidak Dirujuk', gusiBerdarah: '0', lesiMukosaOral: '0',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [toothData, setToothData] = useState(initialToothData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deft, setDeft] = useState({ d: 0, e: 0, f: 0, total: 0 });
  const [dmft, setDmft] = useState({ D: 0, M: 0, F: 0, total: 0 });

  useEffect(() => {
    const age = parseInt(formData.usia, 10);
    if (!isNaN(age)) {
        setToothData(currentToothData => {
            const newToothData = {...currentToothData}; let changed = false;
            if (age >= 15) {
                deciduousTeethSet.forEach(toothNum => { if(newToothData[toothNum] !== '8') { newToothData[toothNum] = '8'; changed = true; } });
            } else {
                 deciduousTeethSet.forEach(toothNum => { if(newToothData[toothNum] === '8') { newToothData[toothNum] = 'A'; changed = true; } });
            }
            return changed ? newToothData : currentToothData;
        });
    }
  }, [formData.usia]);

  useEffect(() => {
    let d = 0, e = 0, f = 0; let D = 0, M = 0, F = 0;
    Object.entries(toothData).forEach(([tooth, status]) => {
        const toothNum = parseInt(tooth);
        if (deciduousTeethSet.has(toothNum)) { if (status === 'B' || status === 'C') d++; if (status === 'E') e++; if (status === 'D') f++; } 
        else { if (status === '1' || status === '2') D++; if (status === '4' || status === '5') M++; if (status === '3') F++; }
    });
    setDeft({ d, e, f, total: d + e + f });
    setDmft({ D, M, F, total: D + M + F });
  }, [toothData]);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleToothClick = (toothNumber) => { setSelectedTooth(toothNumber); setIsModalOpen(true); };
  const handleStatusSave = (toothNumber, status) => { setToothData(prev => ({ ...prev, [toothNumber]: status })); };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.usia) {
      alert("Nama dan Usia wajib diisi!");
      return;
    }
    setIsLoading(true);
    const surveyData = { ...formData, toothData, deft, dmft, createdAt: new Date().toISOString(), createdBy: userId, sessionId: sessionId };
    await onAddSurvey(surveyData);
    setIsLoading(false);
    setPage('LIST'); // Kembali ke daftar setelah menyimpan
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-pink-100 animate-fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold text-pink-800 mb-6 flex items-center">
        <Smile className="mr-3 text-pink-500" size={32}/>Form Survei Kesehatan Gigi
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Bagian Data Diri */}
        <section>
          <h3 className="text-xl font-bold text-pink-700 mb-4 border-b-2 border-pink-200 pb-2">Data Diri Pasien</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={20}/><input type="text" name="nama" placeholder="Nama Pasien" value={formData.nama} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition" required /></div>
            <div className="relative"><Heart className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={20}/><input type="number" name="usia" placeholder="Usia (Tahun)" value={formData.usia} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition" required /></div>
            <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={20}/><input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} name="tanggalLahir" placeholder="Tanggal Lahir" value={formData.tanggalLahir} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition" /></div>
            <div className="relative"><select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange} className="w-full appearance-none bg-white pl-3 pr-10 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition"><option>Laki-laki</option><option>Perempuan</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-pink-500"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div>
            <div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={20}/><input type="text" name="pekerjaan" placeholder="Pekerjaan" value={formData.pekerjaan} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition" /></div>
            <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={20}/><input type="text" name="alamat" placeholder="Alamat (Opsional)" value={formData.alamat} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition" /></div>
            <div className="relative md:col-span-2"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={20}/><input type="text" onFocus={(e) => e.target.type='date'} onBlur={(e) => e.target.type='text'} name="tanggalPemeriksaan" placeholder="Tanggal Pemeriksaan" value={formData.tanggalPemeriksaan} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition" /></div>
          </div>
        </section>

        {/* Bagian Odontogram & Pemeriksaan */}
        <section>
          <h3 className="text-xl font-bold text-pink-700 mb-4 border-b-2 border-pink-200 pb-2">Pemeriksaan & Odontogram</h3>
          <div><p className="text-center text-pink-700 font-semibold mb-2">Odontogram (Klik gigi untuk mengubah kondisi)</p><Odontogram toothData={toothData} onToothClick={handleToothClick} /></div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start p-4 bg-pink-100 rounded-lg border border-pink-200">
              <div className="relative"><label className="font-semibold text-pink-800 mb-1 block flex items-center"><Droplets size={16} className="mr-2"/>Gusi berdarah</label><select name="gusiBerdarah" value={formData.gusiBerdarah} onChange={handleInputChange} className="w-full appearance-none bg-white py-2 px-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition"><option value="0">0 = Tidak</option><option value="1">1 = Ya</option></select></div>
              <div className="relative"><label className="font-semibold text-pink-800 mb-1 block flex items-center"><ShieldAlert size={16} className="mr-2"/>Lesi Mukosa Oral</label><select name="lesiMukosaOral" value={formData.lesiMukosaOral} onChange={handleInputChange} className="w-full appearance-none bg-white py-2 px-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition"><option value="0">0 = Tidak</option><option value="1">1 = Ya</option></select></div>
              <div className="space-y-1"><h4 className="font-semibold text-pink-800">Indeks def-t</h4><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200"><span>d</span><span className="font-bold bg-green-100 text-green-800 px-2 rounded">{deft.d}</span></div><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200"><span>e</span><span className="font-bold bg-green-100 text-green-800 px-2 rounded">{deft.e}</span></div><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200"><span>f</span><span className="font-bold bg-green-100 text-green-800 px-2 rounded">{deft.f}</span></div><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200 font-bold"><span>def-t</span><span className="bg-green-200 text-green-900 px-2 rounded">{deft.total}</span></div></div>
              <div className="space-y-1"><h4 className="font-semibold text-pink-800">Indeks DMF-T</h4><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200"><span>D</span><span className="font-bold bg-blue-100 text-blue-800 px-2 rounded">{dmft.D}</span></div><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200"><span>M</span><span className="font-bold bg-blue-100 text-blue-800 px-2 rounded">{dmft.M}</span></div><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200"><span>F</span><span className="font-bold bg-blue-100 text-blue-800 px-2 rounded">{dmft.F}</span></div><div className="flex items-center justify-between bg-white p-2 rounded-md border border-pink-200 font-bold"><span>DMF-T</span><span className="bg-blue-200 text-blue-900 px-2 rounded">{dmft.total}</span></div></div>
          </div>
        </section>

        {/* Bagian Rekomendasi & Rujukan */}
        <section>
          <h3 className="text-xl font-bold text-pink-700 mb-4 border-b-2 border-pink-200 pb-2">Tindak Lanjut</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start p-4 bg-pink-100 rounded-lg border border-pink-200">
              <div className="relative"><label className="font-semibold text-pink-800 mb-1 block flex items-center"><ClipboardPaste size={16} className="mr-2"/>Rekomendasi Perawatan</label><textarea name="rekomendasi" placeholder="Rekomendasi Perawatan Selanjutnya" value={formData.rekomendasi} onChange={handleInputChange} className="w-full pl-3 pr-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition" rows="3"></textarea></div>
              <div className="relative"><label className="font-semibold text-pink-800 mb-1 block flex items-center"><Send size={16} className="mr-2"/>Rujukan</label><select name="rujukan" value={formData.rujukan} onChange={handleInputChange} className="w-full appearance-none bg-white py-2 px-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition"><option>Tidak Dirujuk</option><option>Puskesmas</option><option>Klinik Pratama</option><option>Klinik Utama</option><option>Rumah Sakit</option></select></div>
          </div>
        </section>

        <div className="pt-8 text-center">
          <button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-pink-600 text-white font-bold py-3 px-10 rounded-full hover:bg-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-pink-300 disabled:cursor-not-allowed flex items-center justify-center mx-auto">
            {isLoading ? 'Menyimpan...' : 'Simpan Data Survei'}
          </button>
        </div>
      </form>
      <StatusModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleStatusSave} toothNumber={selectedTooth} />
    </div>
  );
};

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, surveyName }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md transform transition-all scale-95 animate-modal-pop">
                <div className="text-center">
                    <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
                    <h3 className="mt-4 text-xl font-bold text-gray-800">Hapus Data Survei?</h3>
                    <p className="mt-2 text-gray-600">
                        Anda yakin ingin menghapus data survei untuk pasien <strong className="text-pink-600">{surveyName}</strong>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                </div>
                <div className="mt-8 flex justify-center space-x-4">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors">
                        Batal
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl">
                        Ya, Hapus
                    </button>
                </div>
            </div>
        </div>
    );
};


const SurveyList = ({ surveys, setPage, onDeleteSurvey }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // Will hold the survey object to delete

  const toggleRow = (id) => { setExpandedRow(expandedRow === id ? null : id); };
  const formatDate = (dateString) => { if (!dateString) return 'N/A'; return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); };

  const handleExport = () => {
    if (typeof XLSX === 'undefined') { alert("Library ekspor sedang dimuat, coba lagi sesaat."); return; }
    if (surveys.length === 0) { alert("Tidak ada data untuk diekspor."); return; }
    const dataToExport = surveys.map(survey => {
        const row = { "ID Sesi": survey.sessionId, "Nama": survey.nama, "Usia": survey.usia, "Jenis Kelamin": survey.jenisKelamin, "Tanggal Lahir": survey.tanggalLahir ? new Date(survey.tanggalLahir).toLocaleDateString('id-ID') : 'N/A', "Pekerjaan": survey.pekerjaan, "Alamat": survey.alamat, "Tanggal Pemeriksaan": survey.tanggalPemeriksaan ? new Date(survey.tanggalPemeriksaan).toLocaleDateString('id-ID') : 'N/A', "Gusi Berdarah": survey.gusiBerdarah === '1' ? 'Ya' : 'Tidak', "Lesi Mukosa Oral": survey.lesiMukosaOral === '1' ? 'Ya' : 'Tidak', "def-d": survey.deft?.d ?? 0, "def-e": survey.deft?.e ?? 0, "def-f": survey.deft?.f ?? 0, "def-t (Total)": survey.deft?.total ?? 0, "DMF-D": survey.dmft?.D ?? 0, "DMF-M": survey.dmft?.M ?? 0, "DMF-F": survey.dmft?.F ?? 0, "DMF-T (Total)": survey.dmft?.total ?? 0, "Rekomendasi": survey.rekomendasi, "Rujukan": survey.rujukan, };
        const toothNumbers = Object.keys(survey.toothData).sort((a, b) => a - b);
        toothNumbers.forEach(num => { const status = survey.toothData[num]; const isDeciduous = deciduousTeethSet.has(parseInt(num)); const condition = isDeciduous ? deciduousConditionCodes[status] : permanentConditionCodes[status]; row[`Gigi ${num}`] = `${status} - ${condition?.text || 'N/A'}`; });
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Survei Gigi"); XLSX.writeFile(wb, `DataSurveiGigi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteClick = (survey) => {
    setConfirmDelete(survey);
  };

  const confirmAndDelete = () => {
    if (confirmDelete) {
        onDeleteSurvey(confirmDelete.id);
        setConfirmDelete(null);
    }
  };
  
  return (
    <>
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-xl mt-8 border border-pink-100 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h3 className="text-2xl sm:text-3xl font-bold text-pink-800">Data Survei Tersimpan</h3>
        <div className="flex gap-2">
            <button onClick={() => setPage('FORM')} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white font-semibold rounded-lg shadow-md hover:bg-pink-700 transition-colors"><FilePlus size={18}/>Tambah Survei Baru</button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors"><Share2 size={18}/>Ekspor ke Excel</button>
        </div>
      </div>
      {surveys.length === 0 ? (<p className="text-pink-500 text-center py-8">Belum ada data survei yang ditambahkan.</p>) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-pink-100"><tr><th className="p-3 sm:p-4 font-semibold text-pink-900 rounded-l-lg whitespace-nowrap">Nama</th><th className="p-3 sm:p-4 font-semibold text-pink-900 whitespace-nowrap">Usia</th><th className="p-3 sm:p-4 font-semibold text-pink-900 whitespace-nowrap">Tgl Periksa</th><th className="p-3 sm:p-4 font-semibold text-pink-900 whitespace-nowrap">Rujukan</th><th className="p-3 sm:p-4 font-semibold text-pink-900 rounded-r-lg whitespace-nowrap text-center">Aksi</th></tr></thead>
          <tbody>
            {surveys.map((survey) => (
              <React.Fragment key={survey.id}>
                <tr className="border-b border-pink-200 hover:bg-pink-100/50">
                  <td className="p-3 sm:p-4 whitespace-nowrap">{survey.nama}</td><td className="p-3 sm:p-4 whitespace-nowrap">{survey.usia}</td><td className="p-3 sm:p-4 whitespace-nowrap">{formatDate(survey.tanggalPemeriksaan)}</td><td className="p-3 sm:p-4 whitespace-nowrap">{survey.rujukan || 'Tidak Dirujuk'}</td>
                  <td className="p-3 sm:p-4 whitespace-nowrap text-center">
                    <button onClick={() => toggleRow(survey.id)} className="text-pink-600 font-semibold hover:underline px-2">Detail</button>
                    <button onClick={() => handleDeleteClick(survey)} className="text-red-500 font-semibold hover:underline px-2"><Trash2 className="inline-block h-5 w-5"/></button>
                  </td>
                </tr>
                {expandedRow === survey.id && (
                  <tr className="bg-pink-100/30"><td colSpan="5" className="p-4">
                    <div className="p-4 bg-white rounded-lg border border-pink-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><h4 className="font-bold text-pink-700 mb-3">Detail Kondisi Gigi:</h4><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">{Object.entries(survey.toothData).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([tooth, status]) => { const isDeciduous = deciduousTeethSet.has(parseInt(tooth)); const condition = isDeciduous ? deciduousConditionCodes[status] : permanentConditionCodes[status]; return (<div key={tooth} className={`p-2 rounded-md flex items-center space-x-2 ${condition?.color || 'bg-white'} ${condition?.textColor || 'text-gray-800'}`}><span className="font-bold">{tooth}:</span><span className="text-xs">{condition?.text || 'N/A'}</span></div>); })}</div></div>
                      <div className="space-y-4">
                        <div><h4 className="font-bold text-pink-700 mb-2">Rekomendasi:</h4><p className="text-gray-700 bg-pink-50 p-3 rounded-md">{survey.rekomendasi || '-'}</p></div>
                        <div><h4 className="font-bold text-pink-700 mb-2">Info Tambahan:</h4><ul className="text-gray-700 space-y-1 text-sm bg-pink-50 p-3 rounded-md"><li><strong>ID Sesi:</strong> {survey.sessionId || '-'}</li><li><strong>Pekerjaan:</strong> {survey.pekerjaan || '-'}</li><li><strong>Tgl Lahir:</strong> {formatDate(survey.tanggalLahir)}</li><li><strong>Alamat:</strong> {survey.alamat || '-'}</li><li><strong>Gusi Berdarah:</strong> {survey.gusiBerdarah === '1' ? 'Ya' : 'Tidak'}</li><li><strong>Lesi Mukosa Oral:</strong> {survey.lesiMukosaOral === '1' ? 'Ya' : 'Tidak'}</li></ul></div>
                        <div className="flex gap-4"><div><h4 className="font-bold text-pink-700 mb-2">def-t:</h4><p className="font-bold">{survey.deft?.total ?? 0}</p></div><div><h4 className="font-bold text-pink-700 mb-2">DMF-T:</h4><p className="font-bold">{survey.dmft?.total ?? 0}</p></div></div>
                      </div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
    <ConfirmDeleteModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmAndDelete}
        surveyName={confirmDelete?.nama}
    />
    </>
  );
};

export default function App() {
  const [surveys, setSurveys] = useState([]);
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState('LANDING'); // 'LANDING', 'FORM', 'LIST'

  useEffect(() => {
    const script = document.createElement('script'); script.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"; script.async = true; document.body.appendChild(script);
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) { 
        setUserId(user.uid); 
        const savedSessionId = localStorage.getItem('dentalSurveySessionId');
        if (savedSessionId) {
            setSessionId(savedSessionId);
        } else {
            setSessionId(user.uid); // Default ke UID unik jika tidak ada yang tersimpan
            localStorage.setItem('dentalSurveySessionId', user.uid);
        }
        setIsAuthReady(true);
      } 
      else { 
        try { 
          const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; 
          if (token) { await signInWithCustomToken(auth, token); } 
          else { await signInAnonymously(auth); } 
        } 
        catch (authError) { console.error("Authentication Error:", authError); setError("Gagal melakukan autentikasi."); setIsAuthReady(true); } 
      }
    });
    
    return () => { document.body.removeChild(script); unsubscribeAuth(); };
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    const collectionPath = `artifacts/${appId}/public/data/surveys`; const q = query(collection(db, collectionPath));
    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const surveysData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      surveysData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); setSurveys(surveysData);
    }, (firestoreError) => { console.error("Firestore Error:", firestoreError); setError("Gagal mengambil data dari database."); });
    return () => unsubscribeFirestore();
  }, [isAuthReady]);

  const handleAddSurvey = async (surveyData) => {
    try { const collectionPath = `artifacts/${appId}/public/data/surveys`; await addDoc(collection(db, collectionPath), surveyData); } 
    catch (e) { console.error("Error adding document: ", e); setError("Gagal menyimpan data ke database."); }
  };

  const handleDeleteSurvey = async (surveyId) => {
    try {
        const collectionPath = `artifacts/${appId}/public/data/surveys`;
        const docRef = doc(db, collectionPath, surveyId);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting document: ", e);
        setError("Gagal menghapus data dari database.");
    }
  };

  const handleSessionIdChange = (e) => {
    const newId = e.target.value;
    setSessionId(newId);
    localStorage.setItem('dentalSurveySessionId', newId);
  };

  const renderPage = () => {
    switch (page) {
      case 'FORM':
        return <SurveyForm onAddSurvey={handleAddSurvey} userId={userId} sessionId={sessionId} setPage={setPage} />;
      case 'LIST':
        return <SurveyList surveys={surveys} setPage={setPage} onDeleteSurvey={handleDeleteSurvey} />;
      case 'LANDING':
      default:
        return (
          <div className="text-center bg-white p-8 rounded-2xl shadow-xl animate-fade-in">
              <h2 className="text-2xl font-bold text-pink-800 mb-4">Selamat Datang!</h2>
              <p className="text-pink-600 mb-6">Pilih tindakan yang ingin Anda lakukan.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button onClick={() => setPage('FORM')} className="flex items-center justify-center gap-2 px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg shadow-md hover:bg-pink-700 transition-colors"><FilePlus size={20}/>Mulai Survei Baru</button>
                  <button onClick={() => setPage('LIST')} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-600 transition-colors"><List size={20}/>Lihat Hasil Survei</button>
              </div>
          </div>
        );
    }
  }

  return (
    <>
      <style>{`body { background-color: #fdf2f8; font-family: 'Inter', sans-serif; } @keyframes modal-pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } } .animate-modal-pop { animation: modal-pop 0.3s ease-out forwards; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fade-in 0.5s ease-in-out forwards; }`}</style>
      <div className="min-h-screen bg-pink-100/70 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-pink-900 tracking-tight">Dental Health Survey</h1>
            <p className="mt-2 text-md sm:text-lg text-pink-700">Aplikasi Manajemen Data Kesehatan Gigi dan Mulut</p>
            {isAuthReady && (
                <div className="mt-4 max-w-md mx-auto">
                    <label htmlFor="sessionIdInput" className="block text-sm font-medium text-pink-800 mb-1 flex items-center justify-center gap-2">
                        <Edit size={14}/> ID Sesi Bersama (Bisa Diedit)
                    </label>
                    <input
                        id="sessionIdInput"
                        type="text"
                        value={sessionId}
                        onChange={handleSessionIdChange}
                        className="w-full px-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition text-center shadow-sm"
                        placeholder="Masukkan ID Sesi Bersama"
                    />
                    <p className="mt-1 text-xs text-gray-500">Gunakan ID yang sama di perangkat lain untuk mengelompokkan data.</p>
                </div>
            )}
          </header>
          {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert"><strong className="font-bold">Error!</strong><span className="block sm:inline"> {error}</span></div>)}
          <main>
            {renderPage()}
          </main>
          <footer className="text-center mt-12 text-pink-500 text-sm"><p>Dibuat dengan <Heart className="inline-block text-pink-600" size={14}/> untuk Manajemen Survei Kesehatan Gigi</p><p>&copy; {new Date().getFullYear()} Dental Survey App</p></footer>
        </div>
      </div>
    </>
  );
}
