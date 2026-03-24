import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiExternalLink, FiFileText } from 'react-icons/fi';
import './QuickNotes.css';

function QuickNotes() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  // Tải ghi chú từ LocalStorage khi khởi động
  useEffect(() => {
    const savedNotes = localStorage.getItem("quickNotes");
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Lỗi đọc ghi chú:", e);
      }
    }
  }, []);

  // Lưu ghi chú mỗi khi có thay đổi
  useEffect(() => {
    localStorage.setItem("quickNotes", JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: Date.now(),
      text: newNote,
      date: new Date().toLocaleString('vi-VN')
    };
    setNotes([note, ...notes]);
    setNewNote("");
  };

  const deleteNote = (id) => {
    if (window.confirm("Bạn có chắc muốn xóa ghi chú này?")) {
      setNotes(notes.filter(n => n.id !== id));
    }
  };

  const openExternalApp = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className="quick-notes-section">
      <div className="notes-header">
        <h3 className="chart-title">Ghi chú nhanh & Liên kết</h3>
        <div className="external-links">
          <button className="ext-btn notion" onClick={() => openExternalApp('https://www.notion.so/')} title="Mở Notion">
             Notion <FiExternalLink />
          </button>
          <button className="ext-btn keep" onClick={() => openExternalApp('https://keep.google.com/')} title="Mở Google Keep">
             Keep <FiExternalLink />
          </button>
        </div>
      </div>

      <div className="note-input-area">
        <textarea 
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Viết ghi chú nhanh (VD: Mua thêm 5 bao xi măng...)"
          rows="3"
        />
        <button className="add-note-btn" onClick={addNote} disabled={!newNote.trim()}>
          <FiPlus /> Thêm
        </button>
      </div>

      <div className="notes-grid">
        {notes.length === 0 && <p className="no-notes"><FiFileText size={40} /><br/>Chưa có ghi chú nào.</p>}
        {notes.map(note => (
          <div key={note.id} className="note-card">
            <div className="note-content">{note.text}</div>
            <div className="note-footer">
              <span className="note-date">{note.date}</span>
              <button className="delete-note-btn" onClick={() => deleteNote(note.id)}><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuickNotes;