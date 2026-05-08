import Grid from '@mui/material/Grid'
import CourseCard from './CourseCard'

export default function CourseList({ courses }) {
  return (
    <Grid container spacing={3}>
      {courses.map((course) => (
        <Grid size={{ xs: 12, md: 6, lg: 4, xl: 3 }} key={course.id}>
          <CourseCard course={course} />
        </Grid>
      ))}
    </Grid>
  )
}
