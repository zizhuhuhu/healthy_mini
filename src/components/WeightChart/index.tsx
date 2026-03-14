import { Canvas } from '@tarojs/components'
import { useEffect, useRef, useCallback } from 'react'
import Taro from '@tarojs/taro'

interface WeightChartProps {
  data: Array<{ date: string; weight: number }>
  width?: number
  height?: number
}

export default function WeightChart({ data, width = 350, height = 200 }: WeightChartProps) {
  const canvasId = useRef(`weight-chart-${Date.now()}`).current

  const drawChart = useCallback((ctx: any, chartData: Array<{ date: string; weight: number }>, w: number, h: number) => {
    // 清空画布
    ctx.clearRect(0, 0, w, h)

    if (chartData.length === 0) return

    // 图表边距
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }
    const chartWidth = w - padding.left - padding.right
    const chartHeight = h - padding.top - padding.bottom

    // 获取数据范围
    const weights = chartData.map(d => d.weight)
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)
    const weightRange = maxWeight - minWeight || 1

    // 添加一些上下边距
    const yMin = minWeight - weightRange * 0.1
    const yMax = maxWeight + weightRange * 0.1
    const yRange = yMax - yMin

    // 绘制网格线
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()
    }

    // 绘制Y轴刻度
    ctx.fillStyle = '#6B7280'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      const value = yMax - (yRange / 4) * i
      ctx.fillText(value.toFixed(1), padding.left - 10, y)
    }

    // 计算点的位置
    const points = chartData.map((d, i) => {
      const x = padding.left + (chartWidth / (chartData.length - 1 || 1)) * i
      const y = padding.top + chartHeight - ((d.weight - yMin) / yRange) * chartHeight
      return { x, y, weight: d.weight, date: d.date }
    })

    // 绘制折线
    ctx.strokeStyle = '#16A34A'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y)
      } else {
        ctx.lineTo(point.x, point.y)
      }
    })
    ctx.stroke()

    // 绘制渐变填充
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, 'rgba(22, 163, 74, 0.2)')
    gradient.addColorStop(1, 'rgba(22, 163, 74, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(points[0].x, padding.top + chartHeight)
    points.forEach((point) => {
      ctx.lineTo(point.x, point.y)
    })
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight)
    ctx.closePath()
    ctx.fill()

    // 绘制数据点
    points.forEach((point) => {
      // 外圈
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
      ctx.fill()
      
      // 内圈
      ctx.fillStyle = '#16A34A'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // 绘制X轴日期（只显示部分日期避免拥挤）
    ctx.fillStyle = '#6B7280'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    
    const maxLabels = 5
    const step = Math.ceil(chartData.length / maxLabels)
    chartData.forEach((d, i) => {
      if (i % step === 0 || i === chartData.length - 1) {
        const x = padding.left + (chartWidth / (chartData.length - 1 || 1)) * i
        const dateStr = d.date.slice(5) // 只显示月-日
        ctx.fillText(dateStr, x, padding.top + chartHeight + 10)
      }
    })

    // 显示最新数据
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      ctx.fillStyle = '#16A34A'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${lastPoint.weight.toFixed(1)} kg`, lastPoint.x, lastPoint.y - 10)
    }
  }, [])

  useEffect(() => {
    if (data.length === 0) return

    const query = Taro.createSelectorQuery()
    query
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = Taro.getSystemInfoSync().pixelRatio
        
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        drawChart(ctx, data, width, height)
      })
  }, [data, width, height, canvasId, drawChart])

  return (
    <Canvas
      id={canvasId}
      type="2d"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  )
}
