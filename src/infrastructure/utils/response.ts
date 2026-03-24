import { Context } from "hono";

export const successResponse = (c: Context, data: any, message: string = "Success", status: number = 200) => {
  return c.json({
    ok: true,
    message,
    data
  }, status as any);
};

export const errorResponse = (c: Context, message: string, status: number = 500, data: any = null) => {
  const response: any = {
    ok: false,
    message,
    data
  };
  if (!data) delete response.data;
  return c.json(response, status as any);
};
