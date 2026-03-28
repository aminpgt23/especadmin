import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Save, Eye, Calendar, User, Tag } from 'lucide-react';
import { useApp, API } from '../context/AppContext';
import toast from 'react-hot-toast';

export default function KnowledgeBase() {
  const { user } = useApp();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('articles'); // 'articles' or 'updates'
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    is_system_update: false,
    version: ''
  });
  const [previewContent, setPreviewContent] = useState(null);

  const isAdmin = user?.role === 'admin';

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/knowledge');
      setArticles(data);
    } catch (err) {
      toast.error('Gagal memuat knowledge base');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const filteredArticles = articles.filter(a => 
    selectedTab === 'articles' ? !a.is_system_update : a.is_system_update
  );

  const openCreateModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      category: 'General',
      is_system_update: false,
      version: ''
    });
    setShowModal(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category || 'General',
      is_system_update: article.is_system_update === 1,
      version: article.version || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Hapus artikel "${title}"?`)) return;
    try {
      await API.delete(`/knowledge/${id}`);
      toast.success('Artikel dihapus');
      loadArticles();
    } catch (err) {
      toast.error('Gagal menghapus');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error('Judul dan konten wajib diisi');
      return;
    }
    try {
      if (editingArticle) {
        await API.put(`/knowledge/${editingArticle.id}`, formData);
        toast.success('Artikel diperbarui');
      } else {
        await API.post('/knowledge', formData);
        toast.success('Artikel dibuat');
      }
      setShowModal(false);
      loadArticles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const handlePreview = () => {
    setPreviewContent(formData.content);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('id-ID');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Knowledge Base</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Panduan penggunaan aplikasi dan informasi pembaruan sistem
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={14} /> Artikel Baru
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${selectedTab === 'articles' ? 'active' : ''}`}
          onClick={() => setSelectedTab('articles')}
        >
          📚 Artikel Panduan
        </button>
        <button
          className={`tab ${selectedTab === 'updates' ? 'active' : ''}`}
          onClick={() => setSelectedTab('updates')}
        >
          🔄 Pembaruan Sistem
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="empty-state">
          {selectedTab === 'articles' ? (
            <>
              <Eye size={40} />
              <span>Belum ada artikel panduan</span>
              {isAdmin && (
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <Plus size={14} /> Tambah Artikel
                </button>
              )}
            </>
          ) : (
            <>
              <Calendar size={40} />
              <span>Belum ada catatan pembaruan sistem</span>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredArticles.map(article => (
            <div key={article.id} className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{article.title}</h3>
                    {article.version && (
                      <span className="badge badge-info">v{article.version}</span>
                    )}
                    {article.category && article.category !== 'General' && (
                      <span className="badge badge-yellow" style={{ fontSize: 10 }}>
                        <Tag size={10} style={{ marginRight: 4 }} /> {article.category}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', gap: 12 }}>
                    <span><User size={10} /> {article.created_by}</span>
                    <span><Calendar size={10} /> {formatDate(article.created_at)}</span>
                    {article.updated_at !== article.created_at && (
                      <span><Edit2 size={10} /> diperbarui {formatDate(article.updated_at)}</span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => openEditModal(article)}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDelete(article.id, article.title)}
                      title="Hapus"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div
                className="knowledge-content"
                style={{ marginTop: 12, lineHeight: 1.6, fontSize: 13 }}
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal untuk create/edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editingArticle ? 'Edit Artikel' : 'Artikel Baru'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Judul *</label>
                    <input
                      className="form-input"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <input
                      className="form-input"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Misal: Panduan, Otoritas, Coret, dll."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Konten (HTML/teks biasa) *</label>
                    <textarea
                      className="form-textarea"
                      rows={8}
                      value={formData.content}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
                      required
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handlePreview}>
                        <Eye size={12} /> Preview
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.is_system_update}
                        onChange={e => setFormData({ ...formData, is_system_update: e.target.checked })}
                      />
                      Tandai sebagai pembaruan sistem
                    </label>
                    {formData.is_system_update && (
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Versi (opsional)</label>
                        <input
                          className="form-input"
                          value={formData.version}
                          onChange={e => setFormData({ ...formData, version: e.target.value })}
                          placeholder="Contoh: 1.2.0"
                        />
                      </div>
                    )}
                  </div>
                  {previewContent && (
                    <div className="card" style={{ marginTop: 8 }}>
                      <div className="modal-header" style={{ padding: '8px 12px' }}>
                        <span style={{ fontWeight: 600 }}>Preview</span>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setPreviewContent(null)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div
                        style={{ padding: '12px', fontSize: 13, lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: previewContent }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={13} /> {editingArticle ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}