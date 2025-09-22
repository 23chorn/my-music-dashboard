import express from 'express';
import {
  getAllTags,
  getEntityTags,
  addTagToEntity,
  removeTagFromEntity,
  getEntitiesWithTag,
  getTagStats,
  deleteTag,
  updateTag
} from '../db/tags.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await getAllTags();
    res.json({ tags });
  } catch (error) {
    logger.error(`Error fetching tags: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get tags for a specific entity
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate entity type
    if (!['track', 'album', 'artist'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const tags = await getEntityTags(parseInt(entityId), entityType);
    res.json({ tags });
  } catch (error) {
    logger.error(`Error fetching entity tags: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch entity tags' });
  }
});

// Add a tag to an entity
router.post('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { tagName, color } = req.body;

    if (!tagName || tagName.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Validate entity type
    if (!['track', 'album', 'artist'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const result = await addTagToEntity(
      tagName.trim(),
      parseInt(entityId),
      entityType,
      color || '#3B82F6'
    );

    res.json({
      success: true,
      tag: result.tag,
      wasCreated: result.wasCreated,
      message: result.wasCreated ? 'Tag added successfully' : 'Tag already exists on this entity'
    });
  } catch (error) {
    logger.error(`Error adding tag to entity: ${error.message}`);
    res.status(500).json({ error: 'Failed to add tag to entity' });
  }
});

// Remove a tag from an entity
router.delete('/entity/:entityType/:entityId/:tagId', async (req, res) => {
  try {
    const { entityType, entityId, tagId } = req.params;

    // Validate entity type
    if (!['track', 'album', 'artist'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const result = await removeTagFromEntity(
      parseInt(tagId),
      parseInt(entityId),
      entityType
    );

    res.json({
      success: true,
      wasRemoved: result.wasRemoved,
      message: result.wasRemoved ? 'Tag removed successfully' : 'Tag was not associated with this entity'
    });
  } catch (error) {
    logger.error(`Error removing tag from entity: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove tag from entity' });
  }
});

// Get all entities with a specific tag
router.get('/:tagId/entities', async (req, res) => {
  try {
    const { tagId } = req.params;
    const { entityType, limit = 50, offset = 0 } = req.query;

    const entities = await getEntitiesWithTag(
      parseInt(tagId),
      entityType || null,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({ entities });
  } catch (error) {
    logger.error(`Error fetching entities with tag: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch entities with tag' });
  }
});

// Get tag usage statistics
router.get('/:tagId/stats', async (req, res) => {
  try {
    const { tagId } = req.params;
    const stats = await getTagStats(parseInt(tagId));

    // Calculate total count
    const totalCount = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);

    res.json({
      tagId: parseInt(tagId),
      stats,
      totalCount
    });
  } catch (error) {
    logger.error(`Error fetching tag stats: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tag statistics' });
  }
});

// Update a tag
router.patch('/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const updates = req.body;

    // Validate allowed fields
    const allowedFields = ['name', 'color'];
    const filteredUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Validate tag name if provided
    if (filteredUpdates.name && filteredUpdates.name.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name cannot be empty' });
    }

    const updatedTag = await updateTag(parseInt(tagId), filteredUpdates);

    res.json({
      success: true,
      tag: updatedTag,
      message: 'Tag updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating tag: ${error.message}`);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update tag' });
    }
  }
});

// Delete a tag
router.delete('/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const result = await deleteTag(parseInt(tagId));

    res.json({
      success: true,
      wasDeleted: result.wasDeleted,
      tagName: result.tagName,
      message: result.wasDeleted ? 'Tag deleted successfully' : 'Tag not found'
    });
  } catch (error) {
    logger.error(`Error deleting tag: ${error.message}`);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete tag' });
    }
  }
});

export default router;