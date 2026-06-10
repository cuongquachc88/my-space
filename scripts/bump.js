import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const type = process.argv[2] // patch | minor | major

const pkgPath = resolve(root, 'package.json')
const mfPath  = resolve(root, 'manifest.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const mf  = JSON.parse(readFileSync(mfPath,  'utf8'))

const [major, minor, patch] = pkg.version.split('.').map(Number)
const next =
  type === 'major' ? `${major + 1}.0.0` :
  type === 'minor' ? `${major}.${minor + 1}.0` :
                     `${major}.${minor}.${patch + 1}`

pkg.version = next
mf.version  = next

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
writeFileSync(mfPath,  JSON.stringify(mf,  null, 2) + '\n')

console.log(`bumped to ${next}`)
