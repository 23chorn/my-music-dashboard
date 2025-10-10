const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function getSystemData() {
  try {
    const response = await fetch(`${BASE_URL}/api/insights`);
    if (!response.ok) {
      throw new Error(`Failed to fetch system data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching system data:", error);
    throw error;
  }
}