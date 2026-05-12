import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export interface ListBarChartItem {
  label: string;
  value: number;
}

@Component({
  selector: 'app-list-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-bar-chart.component.html',
  styleUrl: './list-bar-chart.component.css'
})
export class ListBarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: ListBarChartItem[] = [];
  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;

  private chart: Chart<'bar'> | null = null;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    const canvas = this.canvas?.nativeElement;
    if (!canvas) return;

    const labels = this.items.map((item) => item.label);
    const values = this.items.map((item) => item.value);

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: '#3b82f6',
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11, weight: 'bold' } }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#64748b', font: { size: 11, weight: 'bold' } },
            grid: { color: '#e2edf9' }
          }
        }
      }
    });
  }
}
