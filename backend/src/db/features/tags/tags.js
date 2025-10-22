import { getPool } from '../../connection.js';
import logger from '../../../utils/logger.js';

/**
 * Database operations for the custom tags system
 */

// Get all available tags
export async function getAllTags() {
  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT id, name, color, created_at, updated_at
      FROM tags
      ORDER BY name ASC
    `);
    return result.rows;
  } catch (error) {
    logger.error(`Error getting all tags: ${error.message}`);
    throw error;
  }
}

// Get or create a tag by name
export async function getOrCreateTag(name, color = '#3B82F6') {
  const pool = getPool();
  try {
    // First try to get existing tag
    const existingResult = await pool.query(
      'SELECT id, name, color FROM tags WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0];
    }

    // Create new tag if it doesn't exist
    const createResult = await pool.query(
      'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING id, name, color',
      [name.trim(), color]
    );

    logger.info(`Created new tag: ${name}`);
    return createResult.rows[0];
  } catch (error) {
    logger.error(`Error getting/creating tag "${name}": ${error.message}`);
    throw error;
  }
}

// Get tags for a specific entity
export async function getEntityTags(entityId, entityType) {
  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT t.id, t.name, t.color, et.created_at as tagged_at
      FROM tags t
      JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_id = $1 AND et.entity_type = $2
      ORDER BY t.name ASC
    `, [entityId, entityType]);

    return result.rows;
  } catch (error) {
    logger.error(`Error getting tags for ${entityType} ${entityId}: ${error.message}`);
    throw error;
  }
}

// Add a tag to an entity
export async function addTagToEntity(tagName, entityId, entityType, color = '#3B82F6') {
  const pool = getPool();
  try {
    // Validate entity type
    if (!['track', 'album', 'artist'].includes(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    // Get or create the tag
    const tag = await getOrCreateTag(tagName, color);

    // Add the tag to the entity (using ON CONFLICT to prevent duplicates)
    const result = await pool.query(`
      INSERT INTO entity_tags (tag_id, entity_id, entity_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (tag_id, entity_id, entity_type) DO NOTHING
      RETURNING id
    `, [tag.id, entityId, entityType]);

    // Return whether a new association was created
    const wasCreated = result.rows.length > 0;

    if (wasCreated) {
      logger.info(`Tagged ${entityType} ${entityId} with "${tagName}"`);
    }

    return { tag, wasCreated };
  } catch (error) {
    logger.error(`Error adding tag "${tagName}" to ${entityType} ${entityId}: ${error.message}`);
    throw error;
  }
}

// Remove a tag from an entity
export async function removeTagFromEntity(tagId, entityId, entityType) {
  const pool = getPool();
  try {
    const result = await pool.query(`
      DELETE FROM entity_tags
      WHERE tag_id = $1 AND entity_id = $2 AND entity_type = $3
      RETURNING id
    `, [tagId, entityId, entityType]);

    const wasRemoved = result.rows.length > 0;

    if (wasRemoved) {
      logger.info(`Removed tag ${tagId} from ${entityType} ${entityId}`);
    }

    return { wasRemoved };
  } catch (error) {
    logger.error(`Error removing tag ${tagId} from ${entityType} ${entityId}: ${error.message}`);
    throw error;
  }
}

// Get all entities with a specific tag
export async function getEntitiesWithTag(tagId, entityType = null, limit = 50, offset = 0) {
  const pool = getPool();
  try {
    let whereClause = 'et.tag_id = $1';
    let params = [tagId];
    let paramIndex = 2;

    if (entityType) {
      whereClause += ` AND et.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    // Add limit and offset to params and track their positions
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    params.push(limit, offset);

    const result = await pool.query(`
      SELECT
        et.entity_id,
        et.entity_type,
        et.created_at as tagged_at,
        CASE
          WHEN et.entity_type = 'track' THEN (
            SELECT json_build_object(
              'id', t.id,
              'name', t.name,
              'duration_ms', t.duration_ms,
              'artist_name', COALESCE(
                (SELECT a.name FROM track_artists ta JOIN artists a ON ta.artist_id = a.id
                 WHERE ta.track_id = t.id ORDER BY ta.is_primary DESC, a.name LIMIT 1),
                'Unknown Artist'
              ),
              'album_name', COALESCE(
                (SELECT al.name FROM track_albums tal JOIN albums al ON tal.album_id = al.id
                 WHERE tal.track_id = t.id ORDER BY al.release_date DESC LIMIT 1),
                'Unknown Album'
              )
            )
            FROM tracks t WHERE t.id = et.entity_id
          )
          WHEN et.entity_type = 'album' THEN (
            SELECT json_build_object(
              'id', al.id,
              'name', al.name,
              'release_date', al.release_date,
              'image_url', al.image_url,
              'artist_name', COALESCE(
                (SELECT a.name FROM album_artists aa JOIN artists a ON aa.artist_id = a.id
                 WHERE aa.album_id = al.id ORDER BY a.name LIMIT 1),
                'Unknown Artist'
              )
            )
            FROM albums al WHERE al.id = et.entity_id
          )
          WHEN et.entity_type = 'artist' THEN (
            SELECT json_build_object(
              'id', ar.id,
              'name', ar.name,
              'image_url', ar.image_url
            )
            FROM artists ar WHERE ar.id = et.entity_id
          )
        END as entity_data
      FROM entity_tags et
      WHERE ${whereClause}
      ORDER BY et.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `, params);

    return result.rows;
  } catch (error) {
    logger.error(`Error getting entities with tag ${tagId}: ${error.message}`);
    throw error;
  }
}

// Get tag usage statistics
export async function getTagStats(tagId) {
  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT
        et.entity_type,
        COUNT(*) as count
      FROM entity_tags et
      WHERE et.tag_id = $1
      GROUP BY et.entity_type
      ORDER BY et.entity_type
    `, [tagId]);

    return result.rows;
  } catch (error) {
    logger.error(`Error getting tag stats for ${tagId}: ${error.message}`);
    throw error;
  }
}

// Delete a tag and all its associations
export async function deleteTag(tagId) {
  const pool = getPool();
  try {
    // Get tag info before deletion
    const tagResult = await pool.query('SELECT name FROM tags WHERE id = $1', [tagId]);

    if (tagResult.rows.length === 0) {
      throw new Error(`Tag with id ${tagId} not found`);
    }

    const tagName = tagResult.rows[0].name;

    // Delete the tag (CASCADE will delete entity_tags automatically)
    const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING id', [tagId]);

    const wasDeleted = result.rows.length > 0;

    if (wasDeleted) {
      logger.info(`Deleted tag "${tagName}" (id: ${tagId})`);
    }

    return { wasDeleted, tagName };
  } catch (error) {
    logger.error(`Error deleting tag ${tagId}: ${error.message}`);
    throw error;
  }
}

// Update tag properties
export async function updateTag(tagId, updates) {
  const pool = getPool();
  try {
    const allowedFields = ['name', 'color'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [tagId, ...fields.map(field => updates[field])];

    const result = await pool.query(`
      UPDATE tags
      SET ${setClause}
      WHERE id = $1
      RETURNING id, name, color, updated_at
    `, values);

    if (result.rows.length === 0) {
      throw new Error(`Tag with id ${tagId} not found`);
    }

    logger.info(`Updated tag ${tagId}: ${JSON.stringify(updates)}`);
    return result.rows[0];
  } catch (error) {
    logger.error(`Error updating tag ${tagId}: ${error.message}`);
    throw error;
  }
}