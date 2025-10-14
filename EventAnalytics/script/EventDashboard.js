// Import Firebase modules and shared config

import { collection, getDocs, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { db } from './shared.js';
let unsubscribe = null;

      // Format date utility function
      function formatDate(date) {
        if (!date) return "No date";
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Display events function
      function displayEvents(events) {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        
        if (events.length === 0) {
          eventsList.innerHTML = '<div class="status info">No events found.</div>';
          return;
        }
        
        events.forEach(event => {
          const div = document.createElement('div');
          div.className = 'event-item';
          div.innerHTML = `
            <h4>${event.eventName || 'Unnamed Event'}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div>
                <p><strong>Category:</strong> ${event.eventCategory || 'No category'}</p>
                <p><strong>Hosted By:</strong> ${event.school || 'No school specified'}</p>
                <p><strong>Date:</strong> ${formatDate(event.eventDateTime)}</p>
              </div>
              <div>
                <p><strong>Location:</strong> ${event.eventLocation || 'No location'}</p>
                <p><strong>Organizer:</strong> ${event.createdBy || 'Unknown'}</p>
                <p><strong>Price:</strong> $${(event.ticketPrice || 0).toFixed(2)}</p>
              </div>
            </div>
            <div style="margin-bottom: 1rem;">
              <p><strong>Open to:</strong> ${Array.isArray(event.openTo) ? event.openTo.map(school => {
                const schools = {
                  'concordia': 'Concordia University',
                  'mcgill': 'McGill University',
                  'udem': 'Université de Montréal',
                  'polytechnique': 'Polytechnique Montréal',
                  'hec': 'HEC Montréal',
                  'uqam': 'UQAM'
                };
                return schools[school] || school;
              }).join(', ') : 'All Universities'}</p>
            </div>
            <div class="event-stats">
              <div class="stat-box">
                <div class="stat-value">${event.capacity || 0}</div>
                <div class="stat-label">Total Capacity</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${event.ticketsSold || 0}</div>
                <div class="stat-label">Tickets Sold</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${Math.max(0, (event.capacity || 0) - (event.ticketsSold || 0))}</div>
                <div class="stat-label">Available</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${((event.ticketsSold || 0) / (event.capacity || 1) * 100).toFixed(1)}%</div>
                <div class="stat-label">Fill Rate</div>
              </div>
            </div>`;
          eventsList.appendChild(div);
        });
      }

      // Apply filters function
      async function applyFilters() {
        const categoryValue = document.getElementById('eventFilter').value;
        const schoolValue = document.getElementById('schoolFilter').value;
        const ticketType = document.getElementById('ticketTypeFilter').value;
        const minPrice = document.getElementById('minPrice').value;
        const maxPrice = document.getElementById('maxPrice').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        document.getElementById('eventsStatus').textContent = 'Filtering events...';
        document.getElementById('eventsStatus').className = 'status info';

        try {
          // Create base query with eventDateTime ordering
          let q = query(collection(db, 'events'), orderBy('eventDateTime', 'desc'));
          let querySnapshot = await getDocs(q);
          
          // Apply filters in memory for complex queries to avoid index requirements
          let filteredEvents = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            eventDateTime: doc.data().eventDateTime?.toDate()
          })).filter(event => {
            // Category filter
            if (categoryValue !== 'all' && event.eventCategory !== categoryValue) {
              return false;
            }
            
            // School filter - check if the event is open to the selected school
            if (schoolValue !== 'all' && !event.openTo?.includes(schoolValue)) {
              return false;
            }

            // Date range filter
            if (startDate && new Date(startDate) > event.eventDateTime) {
              return false;
            }
            
            if (endDate) {
              const endDatePlusOne = new Date(endDate);
              endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
              if (endDatePlusOne <= event.eventDateTime) {
                return false;
              }
            }

            // Ticket type filter
            if (ticketType === 'free' && event.ticketPrice !== 0) {
              return false;
            } else if (ticketType === 'paid' && event.ticketPrice === 0) {
              return false;
            }

            // Price range filter
            if (minPrice !== '' && event.ticketPrice < Number(minPrice)) {
              return false;
            }
            if (maxPrice !== '' && event.ticketPrice > Number(maxPrice)) {
              return false;
            }

            return true;
          });

          // Store the filtered events for export
          window.currentFilteredEvents = filteredEvents;
          
          displayEvents(filteredEvents);
          document.getElementById('eventsStatus').textContent = `Found ${filteredEvents.length} events`;
          document.getElementById('eventsStatus').className = 'status success';
        } catch (error) {
          console.error('Error filtering events:', error);
          document.getElementById('eventsStatus').textContent = 'Error: ' + error.message;
          document.getElementById('eventsStatus').className = 'status error';
        }
      }

      // Function to export events data to CSV
      function exportToCSV() {
        // Get the current filtered events from the last query
        const events = window.currentFilteredEvents || [];
        
        if (events.length === 0) {
          document.getElementById('eventsStatus').textContent = 'No data to export';
          document.getElementById('eventsStatus').className = 'status error';
          return;
        }

        // Define the fields to export
        const fields = [
          'eventName',
          'eventCategory',
          'school',
          'eventLocation',
          'createdBy',
          'ticketPrice',
          'capacity',
          'ticketsSold',
          'eventDateTime'
        ];

        // Create CSV header
        let csv = fields.join(',') + '\\n';

        // Add data rows
        events.forEach(event => {
          const row = fields.map(field => {
            let value = event[field];
            
            // Format special fields
            if (field === 'eventDateTime') {
              value = formatDate(value);
            } else if (field === 'ticketPrice') {
              value = (value || 0).toFixed(2);
            } else if (value === undefined || value === null) {
              value = '';
            }

            // Escape commas and quotes in the value
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\\n')) {
              value = `"${value}"`;
            }
            
            return value;
          });
          csv += row.join(',') + '\\n';
        });

        // Create blob and download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `events_analytics_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        document.getElementById('eventsStatus').textContent = 'CSV file exported successfully';
        document.getElementById('eventsStatus').className = 'status success';
      }

      // Make functions globally available
      window.displayEvents = displayEvents;
      window.applyFilters = applyFilters;
      window.exportToCSV = exportToCSV;

      // Initialize event loading when page loads
      document.addEventListener('DOMContentLoaded', () => {
        applyFilters();
      });
// Export functions for use in HTML
export {
    displayEvents,
    applyFilters,
    exportToCSV
};

// Initialize event loading when page loads
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        applyFilters();
    });
}

