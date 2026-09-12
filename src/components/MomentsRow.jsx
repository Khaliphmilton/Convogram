import React from 'react';
import { Plus, Loader, AlertCircle } from 'lucide-react';
import './MomentsRow.css';

export function MomentsRow({ moments = [], currentUserId, onAddMoment, onViewMoment, loading, error }) {
  if (error) {
    return (
      <div className="moments-error">
        <AlertCircle size={24} />
        <p>Failed to load Moments</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="moments-loading">
        <Loader className="spinning" />
      </div>
    );
  }

  return (
    <div className="moments-row">
      <div className="moment-item add-moment" onClick={onAddMoment}>
        <div className="moment-circle">
          <Plus size={24} />
        </div>
        <span>Your Moment</span>
      </div>

      {moments.map((moment, index) => (
        <div
          key={moment.id}
          className="moment-item"
          onClick={() => onViewMoment(moment, index)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onViewMoment(moment, index); }}
        >
          <img
            src={moment.media_url}
            alt={moment.profiles?.display_name || 'Moment'}
            className="moment-preview"
          />
          <div className="moment-overlay">
            <img
              src={moment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${moment.profiles?.username || moment.user_id}`}
              alt={moment.profiles?.display_name || ''}
              className="moment-avatar"
            />
            <span className="moment-name">{moment.profiles?.display_name || 'Moment'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
