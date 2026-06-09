import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importApiCourseToSupabase } from '../courseImportService';
import { supabase } from '../../supabaseClient';

// Mock Supabase client
vi.mock('../../supabaseClient', () => {
  const singleMock = vi.fn();
  const selectMock = vi.fn().mockReturnValue({ single: singleMock });
  const insertMock = vi.fn().mockReturnValue({ select: selectMock });
  
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        insert: insertMock
      }),
      rpc: vi.fn(),
    }
  };
});

describe('courseImportService', () => {
  let insertMock, selectMock, singleMock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Re-grab the mocked chain links to control their resolutions per test
    insertMock = supabase.from().insert;
    selectMock = insertMock().select;
    singleMock = selectMock().single;
    
    // Reset implementations
    supabase.rpc.mockResolvedValue({ error: null });
    insertMock.mockReturnValue({ select: selectMock, error: null });
    selectMock.mockReturnValue({ single: singleMock, error: null });
  });

  const mockCourseData = {
    course_name: 'Test Course',
    location: {
      address: '123 Test St',
      city: 'Testville',
      state: 'TS',
      country: 'Testland',
      latitude: 40.0,
      longitude: -80.0
    },
    tees: {
      male: [
        {
          tee_name: 'Blue',
          course_rating: 72.0,
          slope_rating: 130,
          holes: [
            { par: 4, handicap: 1, yardage: 400 },
            { par: 3, handicap: 17, yardage: 150 }
          ]
        }
      ]
    }
  };

  it('successfully imports course data to supabase', async () => {
    // 1. Mock Course Insert
    insertMock.mockReturnValueOnce({ select: selectMock });
    selectMock.mockReturnValueOnce({ single: singleMock, error: null });
    singleMock.mockResolvedValueOnce({ data: { id: 'course-123' }, error: null });

    // 2. Mock Tees Insert
    insertMock.mockReturnValueOnce({ select: selectMock });
    selectMock.mockResolvedValueOnce({ 
      data: [{ id: 'tee-1' }], 
      error: null 
    });

    // 3. Mock Holes Insert
    insertMock.mockReturnValueOnce({ select: selectMock });
    selectMock.mockResolvedValueOnce({
      data: [
        { id: 'hole-1', hole_number: 1 },
        { id: 'hole-2', hole_number: 2 }
      ],
      error: null
    });

    // 4. Mock Yardages Insert (no select chained here in the implementation)
    insertMock.mockResolvedValueOnce({ error: null });

    const result = await importApiCourseToSupabase(mockCourseData, 'user-123');

    expect(result).toBe('course-123');
    
    expect(supabase.from).toHaveBeenCalledWith('courses');
    expect(supabase.from).toHaveBeenCalledWith('course_tees');
    expect(supabase.from).toHaveBeenCalledWith('holes');
    expect(supabase.from).toHaveBeenCalledWith('hole_tee_yardages');
    
    expect(supabase.rpc).toHaveBeenCalledWith('update_course_location', {
      p_course_id: 'course-123',
      p_lat: 40.0,
      p_lng: -80.0
    });
  });

  it('handles course insert errors gracefully', async () => {
    insertMock.mockReturnValueOnce({ select: selectMock });
    singleMock.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

    await expect(importApiCourseToSupabase(mockCourseData, 'user-123'))
      .rejects.toThrow('DB Error');

    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  
  it('handles missing location gracefully', async () => {
    const dataWithoutLoc = { ...mockCourseData, location: null };
    insertMock.mockReturnValueOnce({ select: selectMock });
    selectMock.mockReturnValueOnce({ single: singleMock, error: null });
    singleMock.mockResolvedValueOnce({ data: { id: 'course-123' }, error: null });
    insertMock.mockReturnValueOnce({ select: selectMock });
    selectMock.mockResolvedValueOnce({ data: [{ id: 'tee-1' }], error: null });
    insertMock.mockReturnValueOnce({ select: selectMock });
    selectMock.mockResolvedValueOnce({ data: [{ id: 'hole-1', hole_number: 1 }], error: null });
    insertMock.mockResolvedValueOnce({ error: null });

    const result = await importApiCourseToSupabase(dataWithoutLoc, 'user-123');
    
    expect(result).toBe('course-123');
    expect(supabase.rpc).not.toHaveBeenCalled(); // Location RPC should not be called
  });
});
