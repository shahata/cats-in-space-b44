// Shared utilities for Wix CMS data display

export const statusColors = {
  // Planet statuses
  'Top Candidate': 'text-green-400 bg-green-400/10 border-green-400/30',
  'Exploring': 'text-primary bg-primary/10 border-primary/30',
  'Candidate': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  // Crew statuses
  'Active': 'text-green-400 bg-green-400/10 border-green-400/30',
  'On Mission': 'text-primary bg-primary/10 border-primary/30',
  // Mission statuses
  'In Progress': 'text-primary bg-primary/10 border-primary/30',
  'Launching Soon': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  'Planned': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Planning': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
};

export function getStatusClass(status) {
  return statusColors[status] || 'text-muted-foreground bg-muted border-border';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}