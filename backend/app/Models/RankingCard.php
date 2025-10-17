<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RankingCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'ranking_id',
        'card_id',
        'placement'
    ];

    public function card()
    {
        return $this->belongsTo(Card::class);
    }

    public function ranking()
    {
        return $this->belongsTo(Ranking::class);
    }
}
