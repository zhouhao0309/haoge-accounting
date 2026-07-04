import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Typography, Select, message } from 'antd'
import {
  UndoOutlined,
  ReloadOutlined,
  TrophyOutlined,
  StepForwardOutlined
} from '@ant-design/icons'

// ===== 游戏常量 =====

const CELL_SIZE = 52    // 每格像素大小
const GAP = 2           // 格子间距

// 地图元素
const EMPTY = 0         // 空地
const WALL = 1          // 墙壁
const TARGET = 2        // 目标点
const BOX = 3           // 箱子
const PLAYER = 4        // 玩家
const BOX_ON_TARGET = 5 // 箱子在目标上
const PLAYER_ON_TARGET = 6 // 玩家在目标上

interface Position {
  row: number
  col: number
}

interface MoveRecord {
  playerFrom: Position
  playerTo: Position
  boxFrom: Position | null
  boxTo: Position | null
}

// ===== 关卡数据 =====

const rawLevels: string[] = [
  // 第1关 - 入门：1个箱子
  `
####
# .#
# $#
# @#
####
`,
  // 第2关 - 入门：2个箱子
  `
######
# .  #
# $$ #
#  @ #
#  . #
######
`,
  // 第3关 - 2个箱子
  `
######
# .  #
# $  #
# .@ #
#  $ #
#    #
######
`,
  // 第4关 - 3个箱子
  `
########
# .  . #
# .$   #
#  @$  #
#    $ #
#      #
########
`,
  // 第5关 - 3个箱子
  `
 ######
 # .  #
 # .$ #
 # .$ #
## @ .#
#  $  #
######
`,
  // 第6关 - 经典关卡
  `
  ####
###  ####
#     $ #
# #  #$ #
# . .#@ #
#########
`,
  // 第7关 - 经典关卡
  `
  ####
###  ###
#  $$  #
# #..#.#
# . *# #
#  @ * #
##  #  #
 ######
`,
  // 第8关 - 经典关卡
  `
#######
#     #
#  .$ ##
## $@  #
 #  .$ #
 #  .  #
 #######
`,
  // 第9关 - 4个箱子
  `
########
#  .   #
# $$ # #
# .  @ #
# . ## #
#  $   #
########
`,
  // 第10关 - 终极挑战
  `
 ######
 #    ##
## #  #
#  .$. #
#  . .##
# # $ #
# @$  #
######
`
]

interface LevelInfo {
  map: number[][]
  player: Position
  boxes: Position[]
  targets: Position[]
}

function parseLevel(raw: string): LevelInfo {
  const lines = raw.split('\n').filter(l => l.length > 0)
  // 计算实际列数（补全空格）
  const maxCols = Math.max(...lines.map(l => l.length))
  const map: number[][] = []
  let player: Position = { row: 0, col: 0 }
  const boxes: Position[] = []
  const targets: Position[] = []

  for (let r = 0; r < lines.length; r++) {
    const row: number[] = []
    for (let c = 0; c < maxCols; c++) {
      const ch = c < lines[r].length ? lines[r][c] : ' '
      switch (ch) {
        case '#': row.push(WALL); break
        case ' ': row.push(EMPTY); break
        case '.': row.push(TARGET); targets.push({ row: r, col: c }); break
        case '$': row.push(BOX); boxes.push({ row: r, col: c }); break
        case '*': row.push(BOX_ON_TARGET); boxes.push({ row: r, col: c }); targets.push({ row: r, col: c }); break
        case '@': row.push(PLAYER); player = { row: r, col: c }; break
        case '+': row.push(PLAYER_ON_TARGET); player = { row: r, col: c }; targets.push({ row: r, col: c }); break
        default: row.push(EMPTY)
      }
    }
    map.push(row)
  }
  return { map, player, boxes, targets }
}

function cloneMap(map: number[][]): number[][] {
  return map.map(r => [...r])
}

// 方向定义
const DIRS: Record<string, Position> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
  w: { row: -1, col: 0 },
  s: { row: 1, col: 0 },
  a: { row: 0, col: -1 },
  d: { row: 0, col: 1 },
  W: { row: -1, col: 0 },
  S: { row: 1, col: 0 },
  A: { row: 0, col: -1 },
  D: { row: 0, col: 1 },
}

// ===== React 组件 =====

function SokobanGame(): JSX.Element {
  const [levelIndex, setLevelIndex] = useState(0)
  const [map, setMap] = useState<number[][]>([])
  const [player, setPlayer] = useState<Position>({ row: 0, col: 0 })
  const [steps, setSteps] = useState(0)
  const [pushing, setPushing] = useState(0)
  const [won, setWon] = useState(false)
  const [history, setHistory] = useState<MoveRecord[]>([])
  const wonRef = useRef(false)
  const mapRef = useRef<number[][]>([])
  const playerRef = useRef<Position>({ row: 0, col: 0 })
  const stepsRef = useRef(0)
  const pushingRef = useRef(0)

  // 初始化关卡
  const initLevel = useCallback((idx: number) => {
    if (idx < 0 || idx >= rawLevels.length) return
    const info = parseLevel(rawLevels[idx])
    setMap(info.map)
    setPlayer(info.player)
    setSteps(0)
    setPushing(0)
    setWon(false)
    setHistory([])
    wonRef.current = false
    mapRef.current = info.map
    playerRef.current = info.player
    stepsRef.current = 0
    pushingRef.current = 0
  }, [])

  useEffect(() => { initLevel(levelIndex) }, [levelIndex, initLevel])

  // 检查胜利：所有箱子都在目标点上（标准推箱子规则）
  const checkWin = useCallback((m: number[][]): boolean => {
    for (const row of m) {
      if (row.includes(BOX)) return false
    }
    return true
  }, [])

  // 移动
  const handleMove = useCallback((dir: Position) => {
    if (wonRef.current) return

    const m = cloneMap(mapRef.current)
    const p = playerRef.current
    const newRow = p.row + dir.row
    const newCol = p.col + dir.col

    if (newRow < 0 || newRow >= m.length || newCol < 0 || newCol >= m[0].length) return

    const cell = m[newRow][newCol]

    // 撞墙
    if (cell === WALL) return

    // 空地或目标点 -> 直接移动
    if (cell === EMPTY || cell === TARGET) {
      const move: MoveRecord = {
        playerFrom: { ...p },
        playerTo: { row: newRow, col: newCol },
        boxFrom: null,
        boxTo: null
      }
      setHistory(h => [...h, move])

      // 恢复玩家原位置
      m[p.row][p.col] = (m[p.row][p.col] === PLAYER_ON_TARGET) ? TARGET : EMPTY
      // 放置玩家到新位置
      m[newRow][newCol] = (cell === TARGET) ? PLAYER_ON_TARGET : PLAYER

      mapRef.current = m
      playerRef.current = { row: newRow, col: newCol }
      stepsRef.current += 1
      setMap(m)
      setPlayer({ row: newRow, col: newCol })
      setSteps(s => s + 1)
      return
    }

    // 箱子 -> 推箱子
    if (cell === BOX || cell === BOX_ON_TARGET) {
      const boxRow = newRow + dir.row
      const boxCol = newCol + dir.col

      if (boxRow < 0 || boxRow >= m.length || boxCol < 0 || boxCol >= m[0].length) return

      const beyond = m[boxRow][boxCol]
      if (beyond === WALL || beyond === BOX || beyond === BOX_ON_TARGET) return

      // 执行推动
      const move: MoveRecord = {
        playerFrom: { ...p },
        playerTo: { row: newRow, col: newCol },
        boxFrom: { row: newRow, col: newCol },
        boxTo: { row: boxRow, col: boxCol }
      }
      setHistory(h => [...h, move])

      // 恢复玩家原位置
      m[p.row][p.col] = (m[p.row][p.col] === PLAYER_ON_TARGET) ? TARGET : EMPTY
      // 玩家移到箱子原位置
      m[newRow][newCol] = (cell === BOX_ON_TARGET) ? PLAYER_ON_TARGET : PLAYER
      // 箱子移到新位置
      m[boxRow][boxCol] = (beyond === TARGET) ? BOX_ON_TARGET : BOX

      mapRef.current = m
      playerRef.current = { row: newRow, col: newCol }
      stepsRef.current += 1
      pushingRef.current += 1

      setMap(m)
      setPlayer({ row: newRow, col: newCol })
      setSteps(s => s + 1)
      setPushing(p => p + 1)

      if (checkWin(m)) {
        wonRef.current = true
        setWon(true)
        message.success(`🎉 恭喜通关！共 ${stepsRef.current} 步，推箱子 ${pushingRef.current} 次`)
      }
    }
  }, [checkWin])

  // 键盘事件
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = DIRS[e.key]
      if (!dir) return
      // 不拦截输入框、下拉菜单等交互元素的按键
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).closest('.ant-select-dropdown')) return
      e.preventDefault()
      handleMove(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleMove])

  // 撤销
  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    const m = cloneMap(mapRef.current)

    // 恢复玩家位置
    const pCell = m[last.playerTo.row][last.playerTo.col]
    m[last.playerTo.row][last.playerTo.col] = (pCell === PLAYER_ON_TARGET) ? TARGET : EMPTY
    m[last.playerFrom.row][last.playerFrom.col] = (m[last.playerFrom.row][last.playerFrom.col] === TARGET)
      ? PLAYER_ON_TARGET : PLAYER

    // 恢复箱子位置（如果有）
    if (last.boxFrom && last.boxTo) {
      const bCell = m[last.boxTo.row][last.boxTo.col]
      m[last.boxTo.row][last.boxTo.col] = (bCell === BOX_ON_TARGET) ? TARGET : EMPTY
      m[last.boxFrom.row][last.boxFrom.col] = (m[last.boxFrom.row][last.boxFrom.col] === TARGET)
        ? BOX_ON_TARGET : BOX
    }

    mapRef.current = m
    playerRef.current = last.playerFrom
    stepsRef.current = Math.max(0, stepsRef.current - 1)
    if (last.boxFrom) pushingRef.current = Math.max(0, pushingRef.current - 1)
    wonRef.current = false

    setMap(m)
    setPlayer(last.playerFrom)
    setSteps(stepsRef.current)
    if (last.boxFrom) setPushing(pushingRef.current)
    setWon(false)
    setHistory(prev => prev.slice(0, -1))
  }, [history])

  // 重置当前关卡
  const handleRestart = useCallback(() => {
    initLevel(levelIndex)
  }, [levelIndex, initLevel])

  // 渲染地图
  const rows = map.length
  const cols = map[0]?.length ?? 0

  const renderCell = (cell: number): { bg: string; content: string; shadow: string } => {
    switch (cell) {
      case WALL:
        return { bg: '#5c6370', content: '', shadow: 'inset 2px 2px 4px rgba(255,255,255,0.1), inset -2px -2px 4px rgba(0,0,0,0.3)' }
      case TARGET:
        return { bg: '#ffe7ba', content: '🔘', shadow: 'none' }
      case BOX:
        return { bg: '#e8920e', content: '📦', shadow: '2px 2px 4px rgba(0,0,0,0.3)' }
      case BOX_ON_TARGET:
        return { bg: '#52c41a', content: '✅', shadow: '2px 2px 6px rgba(0,128,0,0.4)' }
      case PLAYER:
        return { bg: '#e8e8e8', content: '🧑', shadow: 'none' }
      case PLAYER_ON_TARGET:
        return { bg: '#ffe7ba', content: '🧑', shadow: 'none' }
      case EMPTY:
      default:
        return { bg: '#f0f0f0', content: '', shadow: 'none' }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* 控制栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        background: '#fff', borderRadius: 8, padding: '12px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        flexWrap: 'wrap', justifyContent: 'center'
      }}>
        <span style={{ color: '#8c8c8c' }}>关卡</span>
        <Select
          value={levelIndex}
          onChange={v => setLevelIndex(v)}
          style={{ width: 100 }}
          options={rawLevels.map((_, i) => ({ value: i, label: `第${i + 1}关` }))}
        />

        <span style={{ color: '#8c8c8c', marginLeft: 8 }}>
          <StepForwardOutlined /> {steps} 步
        </span>
        <span style={{ color: '#8c8c8c' }}>
          📦 推 {pushing} 次
        </span>

        <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={history.length === 0}>
          撤销
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleRestart}>
          重来
        </Button>
      </div>

      {/* 胜利弹窗 */}
      {won && (
        <div style={{
          background: 'linear-gradient(135deg, #fff7e6, #fff1d0)',
          border: '2px solid #fa8c16',
          borderRadius: 12,
          padding: '16px 32px',
          textAlign: 'center',
          animation: 'none'
        }}>
          <Typography.Title level={3} style={{ color: '#fa8c16', margin: 0 }}>
            <TrophyOutlined /> 🎉 恭喜通关！
          </Typography.Title>
          <Typography.Text style={{ fontSize: 16, color: '#595959' }}>
            共 {steps} 步，推箱子 {pushing} 次
          </Typography.Text>
          <div style={{ marginTop: 12 }}>
            <Button
              type="primary"
              icon={<TrophyOutlined />}
              onClick={() => {
                if (levelIndex < rawLevels.length - 1) {
                  setLevelIndex(levelIndex + 1)
                } else {
                  message.success('你已通关全部关卡！🏆')
                }
              }}
            >
              {levelIndex < rawLevels.length - 1 ? '下一关 →' : '🏆 全部通关'}
            </Button>
          </div>
        </div>
      )}

      {/* 游戏面板 */}
      <div style={{
        position: 'relative',
        display: 'inline-block',
        background: '#d9d9d9',
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
          gap: GAP
        }}>
          {map.map((row, r) =>
            row.map((cell, c) => {
              const { bg, content, shadow } = renderCell(cell)
              const isPlayer = cell === PLAYER || cell === PLAYER_ON_TARGET
              return (
                <div key={`${r}-${c}`} style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: bg,
                  borderRadius: cell === WALL ? 2 : 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: cell === TARGET ? 10 : 22,
                  boxShadow: shadow,
                  transition: isPlayer ? 'all 0.08s ease' : 'all 0.12s ease',
                  userSelect: 'none'
                }}>
                  {content}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 操作说明 */}
      <div style={{
        textAlign: 'center', color: '#8c8c8c', fontSize: 13,
        background: '#fff', borderRadius: 8, padding: '10px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
      }}>
        ⌨️ 方向键 / WASD 移动 &nbsp;|&nbsp;
        🖱️ 点击方向按钮 &nbsp;|&nbsp;
        💡 把所有 📦 推到 🔘 上即可通关
      </div>

      {/* 移动端方向键 */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px 60px 60px', gridTemplateRows: '60px 60px 60px', gap: 4 }}>
        <div />
        <Button
          size="large"
          style={{ height: 60, fontSize: 20 }}
          onClick={() => handleMove(DIRS.ArrowUp)}
        >↑</Button>
        <div />
        <Button
          size="large"
          style={{ height: 60, fontSize: 20 }}
          onClick={() => handleMove(DIRS.ArrowLeft)}
        >←</Button>
        <div />
        <Button
          size="large"
          style={{ height: 60, fontSize: 20 }}
          onClick={() => handleMove(DIRS.ArrowRight)}
        >→</Button>
        <div />
        <Button
          size="large"
          style={{ height: 60, fontSize: 20 }}
          onClick={() => handleMove(DIRS.ArrowDown)}
        >↓</Button>
        <div />
      </div>
    </div>
  )
}

export default SokobanGame
