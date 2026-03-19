const userService = require('../services/user.service');
const { increment } = require('../state/request-counter');

const getUsers = async (request, reply) => {
  increment();

  const users = await userService.getPublicUsers();
  return { users };
};

const getUserById = async (request, reply) => {
  increment();

  const userRepository = require('../repositories/user.repository');
  const { id } = request.params;
  const user = await userRepository.findById(id);
  if (!user) {
    return reply.status(404).send({ error: 'User not found' });
  }
  return { user };
};

module.exports = {
  getUsers,
  getUserById,
};
