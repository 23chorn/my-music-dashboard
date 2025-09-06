const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const trendsApi = {
  // Get trends data for metrics over time
  async getTrendsData(days = 90) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trends/metrics?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching trends data:', error);
      throw error;
    }
  },


  // Get combined trends data (metrics now includes diversity score)
  async getCombinedTrends(days = 90) {
    try {
      const trendsData = await this.getTrendsData(days);

      // Add formatted date for display
      const combinedData = trendsData.map(trend => ({
        ...trend,
        formattedDate: new Date(trend.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      }));

      return combinedData;
    } catch (error) {
      console.error('Error fetching combined trends:', error);
      throw error;
    }
  }
};