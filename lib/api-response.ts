import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export const apiError = (status: number, code: string, message: string): NextResponse<ApiErrorBody> =>
  NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
