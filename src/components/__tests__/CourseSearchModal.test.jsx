import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseSearchModal from '../CourseSearchModal';
import { searchCourses, getCourseDetails } from '../../services/golfCourseApiService';
import { importApiCourseToSupabase } from '../../services/courseImportService';
import { supabase } from '../../supabaseClient';

vi.mock('../../services/golfCourseApiService', () => ({
  searchCourses: vi.fn(),
  getCourseDetails: vi.fn()
}));

vi.mock('../../services/courseImportService', () => ({
  importApiCourseToSupabase: vi.fn()
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('CourseSearchModal', () => {
  const mockOnClose = vi.fn();
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
  });

  it('renders the modal correctly', () => {
    render(<CourseSearchModal onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);
    expect(screen.getByText('Add a New Course')).toBeInTheDocument();
    expect(screen.getByLabelText(/Course Name/i)).toBeInTheDocument();
  });

  it('handles search and displays results', async () => {
    const mockCourses = [
      { id: 1, course_name: 'Pinehurst', location: { city: 'Pinehurst', state: 'NC' } }
    ];
    searchCourses.mockResolvedValueOnce(mockCourses);

    render(<CourseSearchModal onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);
    
    const input = screen.getByLabelText(/Course Name/i);
    fireEvent.change(input, { target: { value: 'Pinehurst' } });
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Pinehurst')).toBeInTheDocument();
      expect(screen.getByText('Pinehurst, NC')).toBeInTheDocument();
    });
  });

  it('handles importing a selected course', async () => {
    const mockCourses = [
      { id: 1, course_name: 'Pinehurst', location: { city: 'Pinehurst', state: 'NC' } }
    ];
    searchCourses.mockResolvedValueOnce(mockCourses);
    getCourseDetails.mockResolvedValueOnce({ id: 1, course_name: 'Pinehurst' });
    importApiCourseToSupabase.mockResolvedValueOnce('new-course-id');

    render(<CourseSearchModal onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);
    
    // Search
    fireEvent.change(screen.getByLabelText(/Course Name/i), { target: { value: 'Pinehurst' } });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    // Select course
    await waitFor(() => {
      expect(screen.getByText('Pinehurst')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Pinehurst'));

    // Verify detail view is shown
    expect(screen.getByText(/This will download the course information/i)).toBeInTheDocument();

    // Import course
    fireEvent.click(screen.getByRole('button', { name: /Import Course/i }));

    await waitFor(() => {
      expect(getCourseDetails).toHaveBeenCalledWith(1);
      expect(importApiCourseToSupabase).toHaveBeenCalledWith({ id: 1, course_name: 'Pinehurst' }, 'user-123');
      expect(mockOnImportComplete).toHaveBeenCalledWith('new-course-id');
    });
  });

  it('displays error message on search failure', async () => {
    searchCourses.mockRejectedValueOnce(new Error('API Failure'));

    render(<CourseSearchModal onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);
    
    fireEvent.change(screen.getByLabelText(/Course Name/i), { target: { value: 'Pinehurst' } });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByText('API Failure')).toBeInTheDocument();
    });
  });
});
