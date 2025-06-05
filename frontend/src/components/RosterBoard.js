import React, { useState, useEffect } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { rosterAPI, issuesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RosterColumn from './RosterColumn';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const RosterBoard = ({ onSelectIssue, onCreateIssue, centerDate, onCenterDateChange }) => {
  const { user } = useAuth();
  const [rosterData, setRosterData] = useState({});
  const [issuesData, setIssuesData] = useState({});
  const [loading, setLoading] = useState(true);

  const dates = [];
  for (let i = -4; i <= 4; i++) {
    dates.push(addDays(centerDate, i));
  }

  useEffect(() => {
    loadData();
  }, [centerDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = format(dates[0], 'yyyy-MM-dd');
      const endDate = format(dates[dates.length - 1], 'yyyy-MM-dd');

      const [rosterResponse, issuesResponse] = await Promise.all([
        rosterAPI.getRange(startDate, endDate),
        issuesAPI.getRange(startDate, endDate)
      ]);

      setRosterData(rosterResponse.data);
      setIssuesData(issuesResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDays = (direction) => {
    onCenterDateChange(addDays(centerDate, direction * 9));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button
          onClick={() => navigateDays(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Previous days"
        >
          <FiChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-800">
          Support Roster Schedule
        </h2>

        <button
          onClick={() => navigateDays(1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Next days"
        >
          <FiChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex h-[calc(100vh-8rem)] overflow-x-auto custom-scrollbar">
        {dates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <RosterColumn
              key={dateStr}
              date={date}
              isToday={isToday}
              roster={rosterData[dateStr] || []}
              issues={issuesData[dateStr] || []}
              onSelectIssue={onSelectIssue}
              onCreateIssue={onCreateIssue}
              canCreateIssue={!!user}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RosterBoard;
