export const checkMigrationNeeded = async (fastify) => {
  fastify.log.info(
    'MongoDB mode enabled. File migrations are no longer required.',
  );
};
