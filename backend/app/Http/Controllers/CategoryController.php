<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function getCategory($category)
    {
        $category = Category::findOrFail($category);
        return response()->json($category);
    }

    public function getCategories(Request $request)
    {        
        $categories = Category::orderBy('name')->get();
        return response()->json([]);
    }

    public function addCategory(Request $request)
    {
        $category = Category::create($request->all());
        return response()->json($category);
    }

    public function editCategory(Request $request, Category $category)
    {
        $category->update($request->all());
        return response()->json($category);
    }

    public function deleteCategory(Category $category)
    {
        $category->cards()->detach();
        $category->delete();    
        return response()->json($category);
    }    

}
