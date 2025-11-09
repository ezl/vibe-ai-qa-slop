from django.shortcuts import render
from django.http import JsonResponse
import csv
import io
from collections import defaultdict


def _parse_numeric(value):
    """Parse a value to numeric, handling empty strings and non-numeric values."""
    if value == '' or value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _calculate_agent_statistics(rows):
    """Calculate statistics per agent."""
    agent_stats = defaultdict(lambda: {
        'total_calls': 0,
        'metrics': defaultdict(lambda: {'sum': 0, 'count': 0, 'values': []})
    })
    
    # Identify numeric metric columns (columns that end with specific patterns or are known metrics)
    metric_columns = []
    excluded_metrics = ['leading_questions', 'user_confused', 'asked_every_question']
    if rows:
        for col in rows[0].keys():
            # Look for columns that might be scores/metrics
            if col not in ['order_id', 'applicant_name', 'agent', 'verification_type', 'call_type', 
                          'call_recording_link', 'call_duration'] and not col.endswith('_reasoning') and col not in excluded_metrics:
                metric_columns.append(col)
    
    for row in rows:
        agent = row.get('agent', 'Unknown')
        agent_stats[agent]['total_calls'] += 1
        
        # Count completed calls (call_type == completed_verification)
        call_type = row.get('call_type', '').strip()
        if call_type == 'completed_verification':
            agent_stats[agent]['completed_calls'] = agent_stats[agent].get('completed_calls', 0) + 1
        
        for metric in metric_columns:
            # For correct_inputs, confirmed_company, call_recorded, and followed_script, only count records where call_type is completed_verification
            if metric in ['correct_inputs', 'confirmed_company', 'call_recorded', 'followed_script']:
                if call_type != 'completed_verification':
                    continue
            
            value = _parse_numeric(row.get(metric))
            if value is not None:
                agent_stats[agent]['metrics'][metric]['sum'] += value
                agent_stats[agent]['metrics'][metric]['count'] += 1
                agent_stats[agent]['metrics'][metric]['values'].append(value)
    
    # Convert to final format
    result = {}
    for agent, stats in agent_stats.items():
        metrics_summary = {}
        for metric, metric_data in stats['metrics'].items():
            count = metric_data['count']
            if count > 0:
                avg = metric_data['sum'] / count
                values = metric_data['values']
                # Count flags (values not equal to 1)
                flags_count = sum(1 for v in values if v != 1)
                metrics_summary[metric] = {
                    'average': round(avg, 2),
                    'count': count,
                    'flags': flags_count,
                    'total': stats['total_calls']
                }
        
        result[agent] = {
            'total_calls': stats['total_calls'],
            'completed_calls': stats.get('completed_calls', 0),
            'metrics': metrics_summary
        }
    
    return result


def _calculate_aggregate_statistics(rows, agent_stats):
    """Calculate overall aggregate statistics."""
    total_calls = len(rows)
    
    # Count completed calls
    completed_calls = 0
    for row in rows:
        call_type = row.get('call_type', '').strip()
        if call_type == 'completed_verification':
            completed_calls += 1
    
    # Aggregate metrics across all agents
    all_metrics = defaultdict(lambda: {'sum': 0, 'count': 0, 'values': []})
    
    metric_columns = []
    excluded_metrics = ['leading_questions', 'user_confused', 'asked_every_question']
    if rows:
        for col in rows[0].keys():
            if col not in ['order_id', 'applicant_name', 'agent', 'verification_type', 'call_type',
                          'call_recording_link', 'call_duration'] and not col.endswith('_reasoning') and col not in excluded_metrics:
                metric_columns.append(col)
    
    for row in rows:
        call_type = row.get('call_type', '').strip()
        for metric in metric_columns:
            # For correct_inputs, confirmed_company, call_recorded, and followed_script, only count records where call_type is completed_verification
            if metric in ['correct_inputs', 'confirmed_company', 'call_recorded', 'followed_script']:
                if call_type != 'completed_verification':
                    continue
            
            value = _parse_numeric(row.get(metric))
            if value is not None:
                all_metrics[metric]['sum'] += value
                all_metrics[metric]['count'] += 1
                all_metrics[metric]['values'].append(value)
    
    # Calculate overall averages
    overall_metrics = {}
    for metric, data in all_metrics.items():
        if data['count'] > 0:
            # Count flags (values not equal to 1)
            flags_count = sum(1 for v in data['values'] if v != 1)
            overall_metrics[metric] = {
                'average': round(data['sum'] / data['count'], 2),
                'count': data['count'],
                'flags': flags_count
            }
    
    # Count unique agents
    unique_agents = len(agent_stats)
    
    return {
        'total_calls': total_calls,
        'completed_calls': completed_calls,
        'unique_agents': unique_agents,
        'overall_metrics': overall_metrics
    }


def qa_analysis(request):
    """Main view for QA analysis page."""
    if request.method == 'POST':
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file provided'}, status=400)
        
        uploaded_file = request.FILES['file']
        
        if not uploaded_file.name.endswith('.csv'):
            return JsonResponse({'error': 'File must be a CSV'}, status=400)
        
        try:
            # Read and parse CSV
            file_content = uploaded_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(file_content))
            
            # Parse rows into list of dictionaries
            rows = []
            for row in csv_reader:
                rows.append(row)
            
            # Get column names
            columns = list(rows[0].keys()) if rows else []
            
            # Calculate statistics
            agent_stats = _calculate_agent_statistics(rows)
            aggregate_stats = _calculate_aggregate_statistics(rows, agent_stats)
            
            # Return structured data with statistics
            return JsonResponse({
                'success': True,
                'columns': columns,
                'rows': rows,
                'total_rows': len(rows),
                'agent_statistics': agent_stats,
                'aggregate_statistics': aggregate_stats
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'Error parsing CSV: {str(e)}'}, status=500)
    
    return render(request, 'qa_analysis/index.html')
