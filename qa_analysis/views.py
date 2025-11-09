from django.shortcuts import render
from django.http import JsonResponse
import csv
import io


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
            
            # Return structured data
            return JsonResponse({
                'success': True,
                'columns': columns,
                'rows': rows,
                'total_rows': len(rows)
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'Error parsing CSV: {str(e)}'}, status=500)
    
    return render(request, 'qa_analysis/index.html')
