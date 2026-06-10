import { describe, it, expect } from 'vitest'
import { parseImport } from '../src/lib/parseImport'

describe('parseImport - generic CSV', () => {
  it('parses label and value from columns 0 and 1', () => {
    const csv = 'label,value\nGitHub Token,ghp_abc123\nAWS Key,AKIA123'
    const result = parseImport('secrets.csv', csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ label: 'GitHub Token', value: 'ghp_abc123', tags: [] })
    expect(result[1]).toEqual({ label: 'AWS Key', value: 'AKIA123', tags: [] })
  })

  it('parses tags from column 2 as comma-separated', () => {
    const csv = 'label,value,tags\nMyToken,secret123,"work,infra"'
    const result = parseImport('export.csv', csv)
    expect(result[0].tags).toEqual(['work', 'infra'])
  })

  it('skips header row', () => {
    const csv = 'name,secret\nAPI_KEY,value1'
    const result = parseImport('data.csv', csv)
    expect(result).toHaveLength(1)
  })

  it('skips rows with empty label or value', () => {
    const csv = 'label,value\n,empty_label\nnon_empty,\nok,val'
    const result = parseImport('data.csv', csv)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('ok')
  })
})

describe('parseImport - 1Password CSV', () => {
  it('maps Title to label and Password to value', () => {
    const csv = 'Title,Username,Password,URL,OTPAuth\nGitHub,user@x.com,mypass,https://github.com,'
    const result = parseImport('1password.csv', csv)
    expect(result[0].label).toBe('GitHub')
    expect(result[0].value).toBe('mypass')
  })

  it('uses Category as tag when present', () => {
    const csv = 'Title,Username,Password,URL,OTPAuth,Category\nSlack,u,pw,https://slack.com,,Login'
    const result = parseImport('1password.csv', csv)
    expect(result[0].tags).toEqual(['login'])
  })

  it('skips entries with empty password', () => {
    const csv = 'Title,Username,Password\nEmpty,,\nGood,u,pw'
    const result = parseImport('1password.csv', csv)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Good')
  })
})

describe('parseImport - Bitwarden JSON', () => {
  it('parses login items', () => {
    const json = JSON.stringify({
      items: [
        { name: 'GitHub', type: 1, login: { password: 'ghpass' } },
        { name: 'AWS', type: 1, login: { password: 'awspass' } },
      ]
    })
    const result = parseImport('bitwarden.json', json)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ label: 'GitHub', value: 'ghpass', tags: [] })
  })

  it('skips non-login items (type != 1)', () => {
    const json = JSON.stringify({
      items: [
        { name: 'Note', type: 2, login: null },
        { name: 'Login', type: 1, login: { password: 'pw' } },
      ]
    })
    const result = parseImport('bitwarden.json', json)
    expect(result).toHaveLength(1)
  })

  it('skips items with empty password', () => {
    const json = JSON.stringify({
      items: [
        { name: 'No pw', type: 1, login: { password: '' } },
        { name: 'Has pw', type: 1, login: { password: 'abc' } },
      ]
    })
    const result = parseImport('bitwarden.json', json)
    expect(result).toHaveLength(1)
  })

  it('resolves folderId to folder name as tag', () => {
    const json = JSON.stringify({
      folders: [{ id: 'f1', name: 'Work' }],
      items: [{ name: 'Token', type: 1, login: { password: 'pw' }, folderId: 'f1' }]
    })
    const result = parseImport('bitwarden.json', json)
    expect(result[0].tags).toEqual(['work'])
  })
})
