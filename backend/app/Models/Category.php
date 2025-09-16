<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
        'icon'
    ];

    public function cards()
    {
        return $this->belongsToMany(Card::class, 'card_categories')->withTimestamps();
    }
}