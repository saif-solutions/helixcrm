import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        title: `PaginatedResponseOf${model.name}`,
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              page: {
                type: 'number',
                example: 1,
              },
              limit: {
                type: 'number',
                example: 20,
              },
              total: {
                type: 'number',
                example: 100,
              },
              pages: {
                type: 'number',
                example: 5,
              },
            },
          },
        ],
      },
    }),
  );
};
