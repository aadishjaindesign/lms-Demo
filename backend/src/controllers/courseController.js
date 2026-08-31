import Course from '../models/Course.js';

export const getCourses = async (req, res) => {
  try {
    let query = {};
    if (req.user?.role !== 'admin') {
      query.status = 'active';
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (req.user?.role !== 'admin' && course.status === 'inactive') {
      return res.status(403).json({ error: 'Course is not available' });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { name, description, thumbnail, status } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Course name is required' });

    const course = await Course.create({
      name: name.trim(),
      description: description?.trim(),
      thumbnail: thumbnail?.trim(),
      status: status || 'active',
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create course' });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent status update from this general update route
    if (updateData.status) {
      delete updateData.status;
    }

    const course = await Course.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course' });
  }
};

export const updateCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const course = await Course.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course status' });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
};
