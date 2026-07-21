import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useDialog } from '../../context/DialogContext';
import { API_BASE_URL } from '../../config';

export function CreateGroupModal({ isOpen, onClose }) {
  const { token, user } = useAuth();
  const { chats, setChats, setActiveChat, handleOpenChat } = useChat();
  const { showAlert } = useDialog();

  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupMemberSearchQuery, setGroupMemberSearchQuery] = useState('');
  const [groupMemberSearchResults, setGroupMemberSearchResults] = useState([]);

  if (!isOpen) return null;

  const handleGroupMemberSearch = async (e) => {
    const val = e.target.value;
    setGroupMemberSearchQuery(val);
    if (val.trim().length < 2) {
      setGroupMemberSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/users/search?username=${val}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroupMemberSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createGroupChat = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          isGroup: true,
          members: selectedGroupMembers
        })
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats(prev => [newChat, ...prev]);
        handleOpenChat(newChat._id);
        setNewGroupName('');
        setSelectedGroupMembers([]);
        setGroupMemberSearchQuery('');
        setGroupMemberSearchResults([]);
        onClose();
      } else {
        const err = await response.json();
        showAlert(err.error || 'Failed to create group.');
      }
    } catch (err) {
      console.error('Create Group Chat failed:', err);
      showAlert('Error creating group.');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-container glass-panel animate-fade-in">
        <div className="modal-header border-b">
          <h3>Create Group Chat</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Group Name</label>
            <input 
              type="text" 
              placeholder="Enter a vibrant name..." 
              className="input-field"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>

          {/* Selected members tags/chips */}
          {selectedGroupMembers.length > 0 && (
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label>Selected Members ({selectedGroupMembers.length})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {selectedGroupMembers.map(memberId => {
                  let uName = 'User';
                  const foundInChats = chats.find(c => !c.isGroup && c.members.some(m => m._id === memberId));
                  if (foundInChats) {
                    const mDetails = foundInChats.members.find(m => m._id === memberId);
                    if (mDetails) uName = mDetails.username;
                  } else {
                    const foundInSearch = groupMemberSearchResults.find(u => u._id === memberId);
                    if (foundInSearch) uName = foundInSearch.username;
                  }
                  
                  return (
                    <div 
                      key={memberId} 
                      className="code-badge-item animate-fade-in" 
                      style={{ padding: '3px 8px', fontSize: '0.8rem', gap: '4px', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
                      onClick={() => setSelectedGroupMembers(prev => prev.filter(id => id !== memberId))}
                    >
                      <span>{uName}</span>
                      <X size={12} style={{ opacity: 0.6 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Search and Select Members</label>
            <input 
              type="text" 
              placeholder="Type username to search..." 
              className="input-field input-sm"
              value={groupMemberSearchQuery}
              onChange={handleGroupMemberSearch}
              style={{ marginTop: '4px' }}
            />
          </div>

          <div className="form-group">
            <div className="group-members-selectors" style={{ maxHeight: '160px' }}>
              {groupMemberSearchQuery.trim() ? (
                groupMemberSearchResults.length === 0 ? (
                  <p className="no-chats-msg">No users found matching "{groupMemberSearchQuery}".</p>
                ) : (
                  groupMemberSearchResults.map(sUser => {
                    const isSelected = selectedGroupMembers.includes(sUser._id);
                    return (
                      <div 
                        key={sUser._id} 
                        className={`member-selector-item hover-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedGroupMembers(prev => 
                            isSelected ? prev.filter(id => id !== sUser._id) : [...prev, sUser._id]
                          );
                        }}
                      >
                        <div className="avatar">
                          {sUser.profilePic ? <img src={sUser.profilePic} alt={sUser.username} /> : sUser.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="username">{sUser.username}</span>
                        <div className="checkbox-glow">
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                chats.filter(c => !c.isGroup).map(c => {
                  const oUser = c.members.find(m => m._id !== user?.id && m._id !== user?._id);
                  if (!oUser) return null;
                  const isSelected = selectedGroupMembers.includes(oUser._id || oUser);
                  
                  return (
                    <div 
                      key={oUser._id || oUser} 
                      className={`member-selector-item hover-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedGroupMembers(prev => 
                          isSelected ? prev.filter(id => id !== (oUser._id || oUser)) : [...prev, oUser._id || oUser]
                        );
                      }}
                    >
                      <div className="avatar">
                        {oUser.profilePic ? <img src={oUser.profilePic} alt={oUser.username} /> : oUser.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="username">{oUser.username}</span>
                      <div className="checkbox-glow">
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })
              )}
              {!groupMemberSearchQuery.trim() && chats.filter(c => !c.isGroup).length === 0 && (
                <p className="no-chats-msg">Search above to find and add users to this group.</p>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer border-t">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={createGroupChat} 
            disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupModal;
