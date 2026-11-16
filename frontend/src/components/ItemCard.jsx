import React from 'react';
import { MapPin, Calendar, CheckCircle2, Phone, Tag, ShieldCheck, Trash2, Box } from 'lucide-react';
import { getImageUrl } from '../api';

export default function ItemCard({ item, currentUser, onResolve, onDelete }) {
  const isOwner = currentUser && currentUser.id === item.reporter_id;
  const imageUrl = getImageUrl(item.image_path);

  return (
    <div className={`item-card ${item.is_resolved ? 'is-resolved' : ''}`}>
      <div className="card-media">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="card-img" />
        ) : (
          <div className="card-img-placeholder">
            <Box size={42} strokeWidth={1.5} />
            <span>No photo</span>
          </div>
        )}
        <div className="card-badges">
          <span className={`badge badge-${item.item_type}`}>
            {item.item_type.toUpperCase()}
          </span>
          <span className="badge badge-category">
            <Tag size={12} />
            {item.category}
          </span>
          {item.is_resolved && (
            <span className="badge badge-resolved">
              <CheckCircle2 size={12} />
              Resolved
            </span>
          )}
        </div>
      </div>

      <div className="card-body">
        <h3 className="card-title">{item.name}</h3>
        <p className="card-desc">{item.description}</p>

        <div className="card-meta">
          <div className="meta-row">
            <MapPin size={15} className="meta-icon" />
            <span>{item.location}</span>
          </div>
          <div className="meta-row">
            <Calendar size={15} className="meta-icon" />
            <span>{item.item_date}</span>
          </div>
        </div>

        <div className="card-extra">
          {item.item_type === 'lost' && item.identifying_mark && (
            <div className="extra-box">
              <span className="extra-label">Identifying Mark:</span>
              <p className="extra-value">{item.identifying_mark}</p>
            </div>
          )}

          {item.item_type === 'found' && item.where_kept && (
            <div className="extra-box">
              <span className="extra-label">Kept At:</span>
              <p className="extra-value">{item.where_kept}</p>
            </div>
          )}

          {(item.owner_contact || item.finder_contact) && (
            <div className="contact-box">
              <Phone size={14} />
              <span>Contact: <strong>{item.owner_contact || item.finder_contact}</strong></span>
            </div>
          )}
        </div>

        <div className="card-footer">
          {isOwner && !item.is_resolved && (
            <button
              className="btn btn-sm btn-success"
              onClick={() => onResolve(item.id)}
              title="Only you can mark this item as resolved"
            >
              <ShieldCheck size={16} />
              <span>Mark Resolved</span>
            </button>
          )}

          {isOwner && (
            <button
              className="btn btn-sm btn-ghost-danger"
              onClick={() => onDelete(item.id)}
              title="Delete this listing"
            >
              <Trash2 size={16} />
            </button>
          )}

          {!isOwner && item.is_resolved && (
            <div className="resolved-notice">
              <CheckCircle2 size={14} />
              <span>This item has been returned/resolved</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

