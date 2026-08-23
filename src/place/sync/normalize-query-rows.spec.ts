import { normalizeQueryRows } from './normalize-query-rows'

describe('normalizeQueryRows', () => {
  it('TypeORM PostgreSQL UPDATE 결과에서 RETURNING 행을 꺼낸다', () => {
    expect(normalizeQueryRows<{ id: string }>([[{ id: '1' }], 1])).toEqual([
      { id: '1' },
    ])
  })

  it('SELECT 및 이전 TypeORM 형태의 행 배열도 그대로 반환한다', () => {
    expect(normalizeQueryRows<{ id: string }>([{ id: '1' }])).toEqual([
      { id: '1' },
    ])
  })

  it('행 배열이 아니면 빈 배열을 반환한다', () => {
    expect(normalizeQueryRows(null)).toEqual([])
  })
})
