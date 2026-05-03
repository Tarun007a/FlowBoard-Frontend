import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from 'chart.js';
import { CardStatusSummaryDto } from '../../core/models/analytics.models';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-status-doughnut',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-shell" [class.compact-chart]="compact">
      <canvas #canvas aria-label="Card status distribution" role="img"></canvas>
    </div>
    <div class="chart-legend" *ngIf="showLegend">
      <span *ngFor="let item of slices" class="legend-item">
        <i [style.background]="item.color"></i>
        {{ item.label }} <strong>{{ item.value }}</strong>
      </span>
    </div>
  `,
  styles: [`
    .chart-shell {
      width: 100%;
      height: 190px;
      display: grid;
      place-items: center;
    }

    canvas {
      max-width: 190px;
      max-height: 190px;
    }

    .compact-chart {
      height: 168px;
    }

    .compact-chart canvas {
      max-width: 168px;
      max-height: 168px;
    }

    .chart-legend {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem 0.65rem;
      font-size: 0.78rem;
      color: #536579;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.36rem;
      min-width: 0;
      white-space: nowrap;
    }

    .legend-item i {
      width: 0.62rem;
      height: 0.62rem;
      border-radius: 999px;
      flex: 0 0 auto;
    }

    .legend-item strong {
      color: #1f2f43;
    }
  `]
})
export class StatusDoughnutComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) summary!: CardStatusSummaryDto | null;
  @Input() showLegend = true;
  @Input() compact = false;
  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;

  private chart: Chart<'doughnut'> | null = null;

  get slices(): StatusSlice[] {
    return this.buildSlices();
  }

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

    const slices = this.buildSlices();
    const values = slices.map((item) => item.value);
    const hasData = values.some((value) => value > 0);

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: slices.map((item) => item.label),
        datasets: [{
          data: hasData ? values : [1],
          backgroundColor: hasData ? slices.map((item) => item.color) : ['#d8e2ee'],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: hasData }
        }
      }
    });
  }

  private buildSlices(): StatusSlice[] {
    const summary = this.summary;
    return [
      { label: 'TO_DO', value: summary?.toDo ?? 0, color: '#94a3b8' },
      { label: 'IN_PROGRESS', value: summary?.inProgress ?? 0, color: '#3b82f6' },
      { label: 'IN_REVIEW', value: summary?.inReview ?? 0, color: '#f59e0b' },
      { label: 'DONE', value: summary?.done ?? 0, color: '#22c55e' }
    ];
  }
}
