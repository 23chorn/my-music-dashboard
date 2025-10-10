import dotenv from 'dotenv';
import { initializeDatabase, getPool } from '../src/db/connection.js';
import logger from '../src/utils/logger.js';

dotenv.config();

const pool = () => getPool();

async function deleteTriviaData() {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Starting trivia data deletion...');

    // Delete in order to respect foreign key constraints
    await pool().query('DELETE FROM trivia_responses');
    logger.info('Deleted all trivia responses');

    await pool().query('DELETE FROM trivia_questions');
    logger.info('Deleted all trivia questions');

    await pool().query('DELETE FROM trivia_sessions');
    logger.info('Deleted all trivia sessions');

    await pool().query('DELETE FROM trivia_generation_log');
    logger.info('Deleted all trivia generation logs');

    logger.info('All trivia data deleted successfully!');
    process.exit(0);
  } catch (error) {
    logger.error(`Error deleting trivia data: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

deleteTriviaData();
