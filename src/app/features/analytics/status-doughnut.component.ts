import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { ArcElement, Chart, DoughnutController, Legend, PieController, Tooltip } from 'chart.js';
import { CardStatusSummaryDto } from '../../core/models/analytics.models';

Chart.register(DoughnutController, PieController, ArcElement, Tooltip, Legend);

interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-status-doughnut',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-doughnut.component.html',
  styleUrl: './status-doughnut.component.css'
})
export class StatusDoughnutComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) summary!: CardStatusSummaryDto | null;
  @Input() showLegend = true;
  @Input() compact = false;
  @Input() chartType: 'doughnut' | 'pie' = 'doughnut';
  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;

  slices: StatusSlice[] = [];
  private chart: Chart<'doughnut' | 'pie'> | null = null;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.slices = this.buildSlices();
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    const canvas = this.canvas?.nativeElement;
    if (!canvas) return;

    const slices = this.slices.length ? this.slices : this.buildSlices();
    const values = slices.map((item) => item.value);
    const hasData = values.some((value) => value > 0);

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: this.chartType,
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
        cutout: this.chartType === 'doughnut' ? '68%' : 0,
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
