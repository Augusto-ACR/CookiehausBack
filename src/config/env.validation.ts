import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().optional(),
  DB_HOST: Joi.string().hostname().default('localhost').when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PORT: Joi.number().port().default(5432).when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_USERNAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PASSWORD: Joi.string().allow('').default('').when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_NAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_SYNCHRONIZE: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string()
    .valid('1d', '2d', '3d', '4d', '5d', '6d', '7d')
    .default('7d'),
});

export const envValidationOptions = {
  allowUnknown: true,
  abortEarly: false,
};
