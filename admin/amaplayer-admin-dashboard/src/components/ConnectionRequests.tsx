import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import './ConnectionRequests.css';

interface OrganizationConnection {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  senderRole: 'organization' | 'coach';
  recipientId: string;
  recipientName: string;
  recipientPhotoURL: string;
  recipientRole: 'athlete' | 'organization';
  connectionType: 'org_to_athlete' | 'coach_to_org';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp | Date | string;
  acceptedAt?: Timestamp | Date | string;
  rejectedAt?: Timestamp | Date | string;
  friendshipId?: string;
  createdViaConnection: boolean;
}

interface ConnectionStats {
  totalPending: number;
  totalAccepted: number;
  totalRejected: number;
  acceptanceRate: number;
  averageDaysToAccept: number;
  totalConnections: number;
}

interface TabType {
  all: 'all';
  pending: 'pending';
  accepted: 'accepted';
  rejected: 'rejected';
  org_to_athlete: 'org_to_athlete';
  coach_to_org: 'coach_to_org';
}

export const ConnectionRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<keyof TabType>('all');
  const [connections, setConnections] = useState<OrganizationConnection[]>([]);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<OrganizationConnection | null>(null);

  // Load data on component mount and tab change
  useEffect(() => {
    loadData();
    loadStats();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📍 Loading connections for tab:', activeTab);

      const constraints: QueryConstraint[] = [];

      // Filter by status or connection type based on active tab
      if (activeTab === 'pending') {
        constraints.push(where('status', '==', 'pending'));
      } else if (activeTab === 'accepted') {
        constraints.push(where('status', '==', 'accepted'));
      } else if (activeTab === 'rejected') {
        constraints.push(where('status', '==', 'rejected'));
      } else if (activeTab === 'org_to_athlete') {
        constraints.push(where('connectionType', '==', 'org_to_athlete'));
      } else if (activeTab === 'coach_to_org') {
        constraints.push(where('connectionType', '==', 'coach_to_org'));
      }

      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(100));

      console.log('📍 Querying organizationConnections collection...');
      const q = query(collection(db, 'organizationConnections'), ...constraints);
      const querySnapshot = await getDocs(q);

      console.log('✅ Query successful, found', querySnapshot.size, 'documents');

      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrganizationConnection));

      setConnections(data);
    } catch (err: any) {
      console.error('❌ Error loading connections:', err);
      setError(err.message || 'Failed to load connections');
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📊 Loading connection statistics...');
      const [pendingDocs, acceptedDocs, rejectedDocs, allDocs] = await Promise.all([
        getDocs(query(collection(db, 'organizationConnections'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'organizationConnections'), where('status', '==', 'accepted'))),
        getDocs(query(collection(db, 'organizationConnections'), where('status', '==', 'rejected'))),
        getDocs(collection(db, 'organizationConnections'))
      ]);

      const totalPending = pendingDocs.size;
      const totalAccepted = acceptedDocs.size;
      const totalRejected = rejectedDocs.size;
      const totalConnections = allDocs.size;
      const total = totalPending + totalAccepted + totalRejected;
      const acceptanceRate = total > 0 ? (totalAccepted / total) * 100 : 0;

      // Calculate average days to accept
      let totalDays = 0;
      let acceptedCount = 0;

      acceptedDocs.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && data.acceptedAt) {
          const createdTime = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : new Date(data.createdAt).getTime();
          const acceptedTime = data.acceptedAt instanceof Timestamp ? data.acceptedAt.toMillis() : new Date(data.acceptedAt).getTime();
          const days = (acceptedTime - createdTime) / (1000 * 60 * 60 * 24);
          totalDays += days;
          acceptedCount++;
        }
      });

      const averageDaysToAccept = acceptedCount > 0 ? Math.round(totalDays / acceptedCount * 10) / 10 : 0;

      console.log('✅ Statistics loaded:', { totalPending, totalAccepted, totalRejected });
      setStats({
        totalPending,
        totalAccepted,
        totalRejected,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        averageDaysToAccept,
        totalConnections
      });
    } catch (err: any) {
      console.error('❌ Error loading statistics:', err);
      setStats({
        totalPending: 0,
        totalAccepted: 0,
        totalRejected: 0,
        acceptanceRate: 0,
        averageDaysToAccept: 0,
        totalConnections: 0
      });
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getConnectionTypeLabel = (type: 'org_to_athlete' | 'coach_to_org'): string => {
    return type === 'org_to_athlete' ? 'Organization → Athlete' : 'Coach → Organization';
  };

  const getSenderRoleIcon = (role: 'organization' | 'coach'): string => {
    return role === 'organization' ? '🏢' : '👨‍🏫';
  };

  return (
    <div className="connection-requests-container">
      <h2>🔗 Connection Analytics Dashboard</h2>
      <p className="subtitle">Peer-to-peer connection requests - Recipients accept/reject directly, no admin approval required</p>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalConnections}</div>
            <div className="stat-label">Total Connections</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-number">{stats.totalPending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card accepted">
            <div className="stat-number">{stats.totalAccepted}</div>
            <div className="stat-label">Accepted</div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-number">{stats.totalRejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.acceptanceRate}%</div>
            <div className="stat-label">Acceptance Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.averageDaysToAccept}</div>
            <div className="stat-label">Avg Days to Accept</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📊 All Connections ({stats?.totalConnections || 0})
        </button>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📬 Pending ({stats?.totalPending || 0})
        </button>
        <button
          className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          ✅ Accepted ({stats?.totalAccepted || 0})
        </button>
        <button
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ Rejected ({stats?.totalRejected || 0})
        </button>
        <button
          className={`tab ${activeTab === 'org_to_athlete' ? 'active' : ''}`}
          onClick={() => setActiveTab('org_to_athlete')}
        >
          🏢→🏃 Org to Athlete
        </button>
        <button
          className={`tab ${activeTab === 'coach_to_org' ? 'active' : ''}`}
          onClick={() => setActiveTab('coach_to_org')}
        >
          👨‍🏫→🏢 Coach to Org
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading && <div className="loading">Loading connections...</div>}

      {/* Connections Table */}
      {!loading && (
        <div className="table-container">
          {connections.length === 0 ? (
            <div className="empty-state">
              No connections found for this filter
            </div>
          ) : (
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Sender</th>
                  <th>Recipient</th>
                  <th>Connection Type</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Response Date</th>
                </tr>
              </thead>
              <tbody>
                {connections.map(conn => (
                  <tr key={conn.id} className={`status-${conn.status}`}>
                    <td className="type-cell">
                      <span className="connection-type">
                        {getConnectionTypeLabel(conn.connectionType)}
                      </span>
                    </td>
                    <td className="sender-cell">
                      <span className="sender-role">
                        {getSenderRoleIcon(conn.senderRole)}
                      </span>
                      {conn.senderName}
                    </td>
                    <td className="recipient-cell">{conn.recipientName}</td>
                    <td className="connection-type-cell">
                      {getConnectionTypeLabel(conn.connectionType)}
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${conn.status}`}>
                        {conn.status === 'pending' && '📬 Pending'}
                        {conn.status === 'accepted' && '✅ Accepted'}
                        {conn.status === 'rejected' && '❌ Rejected'}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(conn.createdAt)}</td>
                    <td className="date-cell">
                      {conn.status === 'pending'
                        ? '-'
                        : formatDate(conn.status === 'accepted' ? conn.acceptedAt : conn.rejectedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionRequests;
