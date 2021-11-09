
export const errorResponse = (message: string, code: number) => {
    return {
      statusCode: code,
      headers: { 'Content-Type': 'text/plain' },
      body: `ERROR: ${message}`
    }
}

export const successResponse = (message: string) => {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: message
    }
}