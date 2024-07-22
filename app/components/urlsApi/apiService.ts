// apiService.ts
const getBaseUrlForUser = async (username: string): Promise<string> => {
  try {
    const response = await fetch(`http://66.240.210.125:8586/api/Server/${username}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.servidor;
  } catch (error) {
    console.error('Error fetching base URL:', error);
    throw error;
  }
};

export { getBaseUrlForUser };
