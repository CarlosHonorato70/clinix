export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function parseDateRange(searchParams: URLSearchParams) {
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  return {
    startDate: start ? new Date(start) : undefined,
    endDate: end ? new Date(end) : undefined,
  }
}
