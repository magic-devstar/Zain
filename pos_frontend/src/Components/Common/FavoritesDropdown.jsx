import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, Plus, Trash2, ExternalLink, Edit2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import { getCurrentPageTitle } from '../../utils/usePageTitle';

const FavoritesDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFavorite, setNewFavorite] = useState({ title: '', url: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch favorites on component mount
  useEffect(() => {
    fetchFavorites();
  }, []);

  // Robust outside click handler for portal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setShowAddForm(false);
        setEditingId(null); // Exit edit mode when closing dropdown
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchFavorites = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/auth/favorites/');
      setFavorites(response.data.results);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const addFavorite = async () => {
    if (!newFavorite.title.trim() || !newFavorite.url.trim()) {
      toast.error('Please enter both title and URL');
      return;
    }

    try {
      const response = await api.post('/auth/favorites/', {
        title: newFavorite.title.trim(),
        url: newFavorite.url.trim()
      });
      
      setFavorites(prev => [response.data.results, ...prev]);
      setNewFavorite({ title: '', url: '' });
      setShowAddForm(false);
      toast.success('Favorite added successfully!');
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast.error(error.response?.data?.detail || 'Failed to add favorite');
    }
  };

  const removeFavorite = async (favoriteId) => {
    try {
      await api.delete(`/auth/favorites/${favoriteId}/`);
      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      toast.success('Favorite removed successfully!');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const startEditing = (favorite) => {
    setEditingId(favorite.id);
    setEditingTitle(favorite.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEdit = async () => {
    if (!editingTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      const response = await api.patch(`/auth/favorites/${editingId}/`, {
        title: editingTitle.trim()
      });
      
      setFavorites(prev => prev.map(fav => 
        fav.id === editingId ? { ...fav, title: editingTitle.trim() } : fav
      ));
      setEditingId(null);
      setEditingTitle('');
      toast.success('Favorite updated successfully!');
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast.error(error.response?.data?.detail || 'Failed to update favorite');
    }
  };

  const navigateToFavorite = (url) => {
    navigate(url);
    setTimeout(() => setIsOpen(false), 100); // Delay closing
  };

  const isCurrentPageFavorited = () => {
    return Array.isArray(favorites) && favorites.some(fav => fav.url === location.pathname);
  };

  const addCurrentPageToFavorites = async () => {
    // Clean up the pathname to get a user-friendly title
    const getCleanTitle = (pathname) => {
      // Remove admin/manager/etc prefixes and trailing slashes
      const cleanPath = pathname.replace(/^\/(?:admin|manager|technician|reporter|partner|servicecustomer|vendingCustomer|warehouseManager|warehouseTechnician)\//, '').replace(/\/$/, '');
      
      // Split by slashes and get the last meaningful part
      const parts = cleanPath.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1] || cleanPath;

      // Convert to title case and replace hyphens/underscores with spaces
      return lastPart
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    const cleanTitle = getCleanTitle(location.pathname);
    
    try {
      const response = await api.post('/auth/favorites/', {
        title: cleanTitle,
        url: location.pathname
      });
      
      setFavorites(prev => [response.data, ...(Array.isArray(prev) ? prev : [])]);
      toast.success('Current page added to favorites!');
    } catch (error) {
      console.error('Error adding current page to favorites:', error);
      toast.error(error.response?.data?.detail || 'Failed to add to favorites');
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-white hover:text-primary transition-colors"
        title="Favorites"
      >
        <Star 
          size={20} 
          className={isCurrentPageFavorited() ? "fill-yellow-400 text-yellow-400" : "text-primary_light"} 
        />
      </button>

      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          className="fixed top-16 right-8 w-80 bg-white rounded-lg shadow-lg border border-gray-200"
          style={{ zIndex: 2147483647 }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Favorites</h3>
              <div className="flex gap-2">
                {!isCurrentPageFavorited() && (
                  <button
                    onClick={addCurrentPageToFavorites}
                    className="p-1 text-gray-600 hover:text-primary transition-colors cursor-pointer"
                    title="Add current page to favorites"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Add new favorite form */}
            {showAddForm && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  placeholder="Title"
                  value={newFavorite.title}
                  onChange={(e) => setNewFavorite(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="URL (e.g., /dashboard)"
                  value={newFavorite.url}
                  onChange={(e) => setNewFavorite(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addFavorite}
                    className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewFavorite({ title: '', url: '' });
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Favorites list */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading favorites...</div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No favorites yet. Add some to get started!
                </div>
              ) : (
                <div className="space-y-2">
                  {favorites.map((favorite) => (
                    <div
                      key={favorite.id}
                      className={
                        "flex items-center justify-between p-2 hover:bg-gray-50 rounded-md group " +
                        (favorite.url === location.pathname ? "border-2 border-primary" : "")
                      }
                    >
                      {editingId === favorite.id ? (
                        // Edit mode
                        <div className="flex-1 flex items-center gap-2">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveEdit();
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        // View mode
                        <button
                          onClick={() => navigateToFavorite(favorite.url)}
                          title={favorite.title}
                          className="flex-1 text-left flex items-center gap-2 hover:text-primary transition-colors cursor-pointer overflow-auto"
                        >
                          <Star size={14} className="fill-yellow-400 text-yellow-400 " />
                          <span className="truncate">{favorite.title}</span>
                        </button>
                      )}
                      
                      <div className="flex items-center gap-1 transition-opacity">
                        {editingId === favorite.id ? (
                          // Edit mode buttons
                          <>
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-600 hover:text-green-700 transition-colors"
                              title="Save changes"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-gray-600 hover:text-gray-700 transition-colors"
                              title="Cancel edit"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          // View mode buttons
                          <>
                            <button
                              onClick={() => navigateToFavorite(favorite.url)}
                              className="p-1 text-gray-600 hover:text-primary transition-colors cursor-pointer"
                              title="Navigate to favorite"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              onClick={() => startEditing(favorite)}
                              className="p-1 text-gray-600 hover:text-blue-500 transition-colors"
                              title="Edit favorite"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => removeFavorite(favorite.id)}
                              className="p-1 text-gray-600 hover:text-red-500 transition-colors"
                              title="Remove favorite"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FavoritesDropdown; 