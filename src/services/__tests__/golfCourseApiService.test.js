import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchCourses, getCourseDetails } from '../golfCourseApiService';

describe('golfCourseApiService', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOLF_COURSE_API_KEY', 'test-api-key');
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('searchCourses', () => {
    it('throws error if API key is missing', async () => {
      vi.stubEnv('VITE_GOLF_COURSE_API_KEY', '');
      await expect(searchCourses('pinehurst')).rejects.toThrow('Golf Course API key is missing');
    });

    it('returns courses on successful search', async () => {
      const mockCourses = [{ id: 1, course_name: 'Pinehurst' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courses: mockCourses }),
      });

      const result = await searchCourses('pinehurst');
      expect(result).toEqual(mockCourses);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.golfcourseapi.com/v1/search?search_query=pinehurst',
        expect.objectContaining({
          headers: {
            'Authorization': 'Key test-api-key',
            'Accept': 'application/json'
          }
        })
      );
    });

    it('throws custom error message on API failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Invalid query parameters' }),
      });

      await expect(searchCourses('invalid')).rejects.toThrow('Invalid query parameters');
    });
  });

  describe('getCourseDetails', () => {
    it('throws error if API key is missing', async () => {
      vi.stubEnv('VITE_GOLF_COURSE_API_KEY', '');
      await expect(getCourseDetails(123)).rejects.toThrow('Golf Course API key is missing');
    });

    it('unwraps the course object from response on success', async () => {
      const mockCourse = { id: 123, course_name: 'Pinehurst No. 2' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ course: mockCourse }),
      });

      const result = await getCourseDetails(123);
      expect(result).toEqual(mockCourse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.golfcourseapi.com/v1/courses/123',
        expect.objectContaining({
          headers: {
            'Authorization': 'Key test-api-key',
            'Accept': 'application/json'
          }
        })
      );
    });

    it('throws appropriate error on failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ error: 'Course not found' }),
      });

      await expect(getCourseDetails(999)).rejects.toThrow('Course not found');
    });
  });
});
